package com.senju.tv

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import java.io.*
import java.security.KeyStore
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.Executors
import java.util.zip.GZIPInputStream
import java.util.zip.GZIPOutputStream
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

/** Bounded encrypted pages, private cacheDir, serial disk worker and atomic snapshot publication. */
class CatalogCacheModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val root = File(context.cacheDir, "catalog-v1")
  private val worker = Executors.newSingleThreadExecutor()
  private data class Write(val dir: File, var pages: Int = 0, var bytes: Long = 0)
  private val writers = mutableMapOf<String, Write>()
  private val readers = mutableMapOf<String, File>()
  private val pageLimit = 2 * 1024 * 1024
  private val snapshotLimit = 64L * 1024 * 1024
  private val diskLimit = 96L * 1024 * 1024
  private var encryptionKey: SecretKey? = null
  override fun getName() = "SenjuCatalogCache"

  private fun task(promise: Promise, action: () -> Any?) {
    worker.execute {
      try { promise.resolve(action()) }
      catch (_: Exception) { promise.reject("CATALOG_CACHE", "Não foi possível acessar o cache do catálogo.") }
    }
  }
  private fun hash(value: String) = MessageDigest.getInstance("SHA-256")
    .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
  private fun target(namespace: String, key: String) = File(File(root, hash(namespace)), hash(key))
  private fun key(): SecretKey {
    encryptionKey?.let { return it }
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    val alias = "senju.catalog.cache.v1"
    (store.getKey(alias, null) as? SecretKey)?.let { encryptionKey = it; return it }
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
      init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256).build())
      generateKey().also { encryptionKey = it }
    }
  }
  private fun aad(file: File) = "${file.parentFile!!.parentFile!!.parentFile!!.name}/${file.parentFile!!.parentFile!!.name}/${file.parentFile!!.name.removePrefix(".")}/${file.name}".toByteArray(Charsets.UTF_8)
  private fun encrypt(file: File, value: String) {
    val bytes = value.toByteArray(Charsets.UTF_8)
    require(bytes.size <= pageLimit)
    val compressed = ByteArrayOutputStream().also { buffer -> GZIPOutputStream(buffer).use { it.write(bytes) } }.toByteArray()
    val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
      init(Cipher.ENCRYPT_MODE, key()); updateAAD(aad(file))
    }
    DataOutputStream(FileOutputStream(file)).use {
      it.writeInt(1); it.writeInt(cipher.iv.size); it.write(cipher.iv); it.write(cipher.doFinal(compressed))
    }
  }
  private fun decrypt(file: File): String {
    require(file.length() <= pageLimit + 4096)
    return DataInputStream(FileInputStream(file)).use { input ->
      require(input.readInt() == 1)
      val ivSize = input.readInt(); require(ivSize == 12)
      val iv = ByteArray(ivSize); input.readFully(iv)
      val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
        init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv)); updateAAD(aad(file))
      }
      val compressed = cipher.doFinal(input.readBytes())
      GZIPInputStream(ByteArrayInputStream(compressed)).use { gzip ->
        val buffer = ByteArray(8192)
        val output = ByteArrayOutputStream()
        while (true) {
          val count = gzip.read(buffer); if (count < 0) break
          require(output.size() + count <= pageLimit); output.write(buffer, 0, count)
        }
        String(output.toByteArray(), Charsets.UTF_8)
      }
    }
  }
  private fun current(dir: File): File? {
    val pointer = AtomicFile(File(dir, "current"))
    val generation = try { String(pointer.readFully(), Charsets.UTF_8) } catch (_: FileNotFoundException) { return null }
    if (!generation.matches(Regex("[0-9a-f-]{36}"))) return null
    return File(dir, generation).takeIf { it.isDirectory }
  }
  @ReactMethod fun openRead(namespace: String, cacheKey: String, promise: Promise) = task(promise) {
    val dir = target(namespace, cacheKey)
    val snapshot = current(dir) ?: return@task null
    val manifest = decrypt(File(snapshot, "manifest"))
    val handle = UUID.randomUUID().toString(); readers[handle] = snapshot
    dir.setLastModified(System.currentTimeMillis())
    Arguments.createMap().apply { putString("handle", handle); putString("manifest", manifest) }
  }
  @ReactMethod fun readPage(handle: String, index: Int, promise: Promise) = task(promise) {
    require(index in 0..1999)
    decrypt(File(requireNotNull(readers[handle]), "page-$index"))
  }
  @ReactMethod fun closeRead(handle: String, promise: Promise) = task(promise) {
    readers.remove(handle)?.let { prune(it.parentFile!!) }; trim(); null
  }
  @ReactMethod fun beginWrite(namespace: String, cacheKey: String, promise: Promise) = task(promise) {
    val token = UUID.randomUUID().toString()
    val destination = target(namespace, cacheKey)
    if (destination.exists()) prune(destination)
    trim()
    val dir = File(destination, ".$token")
    check(dir.mkdirs()); writers[token] = Write(dir); token
  }
  @ReactMethod fun writePage(token: String, index: Int, value: String, promise: Promise) = task(promise) {
    val write = requireNotNull(writers[token])
    require(index == write.pages && index < 2000)
    val size = value.toByteArray(Charsets.UTF_8).size
    require(write.bytes + size <= snapshotLimit)
    check(root.usableSpace > size + 8L * 1024 * 1024)
    encrypt(File(write.dir, "page-$index"), value)
    write.pages++; write.bytes += size; null
  }
  @ReactMethod fun commit(token: String, manifest: String, promise: Promise) = task(promise) {
    val write = requireNotNull(writers[token])
    require(JSONObject(manifest).getInt("pages") == write.pages)
    encrypt(File(write.dir, "manifest"), manifest)
    val dir = write.dir.parentFile!!
    val published = File(dir, token); check(write.dir.renameTo(published))
    val pointer = AtomicFile(File(dir, "current"))
    val stream = pointer.startWrite()
    try { stream.write(token.toByteArray(Charsets.UTF_8)); pointer.finishWrite(stream) }
    catch (error: Exception) { pointer.failWrite(stream); published.deleteRecursively(); throw error }
    writers.remove(token)
    dir.setLastModified(System.currentTimeMillis()); prune(dir); trim(); null
  }
  @ReactMethod fun abortWrite(token: String, promise: Promise) = task(promise) {
    writers.remove(token)?.dir?.deleteRecursively(); null
  }
  private fun prune(dir: File) {
    val keep = current(dir)
    dir.listFiles()?.filter { it.isDirectory && it != keep && it !in readers.values && writers.values.none { w -> w.dir == it } }
      ?.forEach { it.deleteRecursively() }
  }
  private fun trim() {
    val entries = root.listFiles()?.flatMap { it.listFiles()?.toList() ?: emptyList() } ?: emptyList()
    fun size(file: File) = file.walkTopDown().filter { it.isFile }.sumOf { it.length() }
    var total = entries.sumOf { size(it) }
    for (dir in entries.sortedBy { it.lastModified() }) {
      if (total <= diskLimit) break
      if (readers.values.any { it.parentFile == dir } || writers.values.any { it.dir.parentFile == dir }) continue
      val bytes = size(dir); if (dir.deleteRecursively()) total -= bytes
    }
  }
  @ReactMethod fun clear(namespace: String?, promise: Promise) = task(promise) {
    // All handles are invalidated; a pending JS read becomes a cache miss.
    val dir = if (namespace == null) root else File(root, hash(namespace))
    readers.entries.removeAll { it.value.canonicalPath.startsWith(dir.canonicalPath + File.separator) }
    writers.entries.removeAll { it.value.dir.canonicalPath.startsWith(dir.canonicalPath + File.separator) }
    check(!dir.exists() || dir.deleteRecursively()); null
  }
  override fun invalidate() {
    worker.execute { writers.values.forEach { it.dir.deleteRecursively() }; writers.clear(); readers.clear() }
    worker.shutdown(); super.invalidate()
  }
}

class CatalogCachePackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(CatalogCacheModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
