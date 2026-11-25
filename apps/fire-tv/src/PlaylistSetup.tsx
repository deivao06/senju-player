import React, { useRef } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TVFocusGuideView,
  useWindowDimensions,
  View,
} from 'react-native';
import type { SavedPlaylist } from '@senju/iptv';
import { Button } from './Button';
import { Input } from './Input';
import { colors } from './theme';
import { Icon } from './Icon';

export type SetupValues = { name: string; url: string; username: string; password: string };
type Props = {
  playlists: SavedPlaylist[];
  mode: 'M3U' | 'XTREAM';
  values: SetupValues;
  onModeChange: (mode: 'M3U' | 'XTREAM') => void;
  onChange: (field: keyof SetupValues, value: string) => void;
  onSelect: (playlist: SavedPlaylist) => void;
  onRemove: (id: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onBack?: () => void;
  backLabel?: string;
  loading: boolean;
  error: string;
};
export function PlaylistSetup({
  playlists,
  mode,
  values,
  onModeChange,
  onChange,
  onSelect,
  onRemove,
  onSubmit,
  onCancel,
  onBack,
  backLabel = 'Catálogo',
  loading,
  error,
}: Props) {
  const { height, width } = useWindowDimensions();
  const short = height < 430;
  const verticalPadding = short ? 14 : 28;
  const formMaxHeight = Math.max(0, height - verticalPadding * 2 - 26);
  const urlRef = useRef<TextInput>(null);
  const userRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  return (
    <SafeAreaView style={[styles.screen, { paddingVertical: verticalPadding }]}>
      <View style={[styles.layout, width < 760 && { gap: 20 }]}>
        <View style={styles.intro}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Icon name="play" size={24} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.brandName}>SENJU PLAYER</Text>
              <Text style={styles.slogan}>Suas listas. Sua experiência.</Text>
            </View>
          </View>
          {!short && (
            <View style={styles.hero}>
              <Text style={styles.title}>
                O seu mundo.{'\n'}
                <Text style={styles.titleAccent}>Na sua TV.</Text>
              </Text>
              <Text style={styles.description}>
                {playlists.length
                  ? 'Suas listas, prontas para assistir.'
                  : 'Canais, filmes e séries em um só lugar. Conecte sua lista para começar.'}
              </Text>
            </View>
          )}
          {!!playlists.length && (
            <TVFocusGuideView
              autoFocus
              style={[styles.savedSection, short && styles.savedSectionShort]}
            >
              <Text style={styles.sectionLabel}>Suas listas</Text>
              <ScrollView style={styles.savedScroll} keyboardShouldPersistTaps="handled">
                {playlists.map((playlist, index) => (
                  <View key={playlist.id} style={styles.savedRow}>
                    <Button
                      title={playlist.name}
                      iconName="play"
                      quiet
                      preferred={index === 0}
                      disabled={loading}
                      onPress={() => onSelect(playlist)}
                      style={styles.savedButton}
                    />
                    <Button
                      title="Remover"
                      icon={<Icon name="close" size={18} color={colors.muted} />}
                      accessibilityLabel={`Remover ${playlist.name}`}
                      disabled={loading}
                      onPress={() => onRemove(playlist.id)}
                      style={styles.removeButton}
                    />
                  </View>
                ))}
              </ScrollView>
            </TVFocusGuideView>
          )}
        </View>
        <View style={styles.formColumn}>
          <TVFocusGuideView autoFocus style={[styles.formGuide, { maxHeight: formMaxHeight }]}>
            <View style={[styles.card, { maxHeight: formMaxHeight }]}>
              <ScrollView
                style={styles.formBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {playlists.length ? 'Adicionar lista' : 'Conectar lista'}
                  </Text>
                  <View style={styles.tabs}>
                    <Button
                      title="M3U"
                      small
                      quiet
                      selected={mode === 'M3U'}
                      preferred={!playlists.length}
                      disabled={loading}
                      onPress={() => onModeChange('M3U')}
                      style={styles.tab}
                    />
                    <Button
                      title="Xtream Codes"
                      small
                      quiet
                      selected={mode === 'XTREAM'}
                      disabled={loading}
                      onPress={() => onModeChange('XTREAM')}
                      style={styles.tab}
                    />
                  </View>
                </View>
                <View style={styles.fields}>
                  <View>
                    <Text style={styles.label}>Nome da lista</Text>
                    <Input
                      style={styles.formInput}
                      accessibilityLabel="Nome da lista"
                      placeholder="Ex.: Minha lista"
                      value={values.name}
                      editable={!loading}
                      onChangeText={(value) => onChange('name', value)}
                      returnKeyType="next"
                      onSubmitEditing={() => urlRef.current?.focus()}
                    />
                  </View>
                  <View>
                    <Text style={styles.label}>
                      {mode === 'M3U' ? 'Link da lista' : 'Endereço do servidor'}
                    </Text>
                    <Input
                      style={styles.formInput}
                      ref={urlRef}
                      accessibilityLabel={mode === 'M3U' ? 'Link da lista' : 'Endereço do servidor'}
                      placeholder={
                        mode === 'M3U'
                          ? 'http://servidor.com/lista.m3u'
                          : 'http://servidor.com:8080'
                      }
                      value={values.url}
                      editable={!loading}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onChangeText={(value) => onChange('url', value)}
                      returnKeyType={mode === 'XTREAM' ? 'next' : 'done'}
                      onSubmitEditing={() =>
                        mode === 'XTREAM' ? userRef.current?.focus() : onSubmit()
                      }
                    />
                  </View>
                  {mode === 'XTREAM' && (
                    <View style={styles.credentials}>
                      <View style={styles.credential}>
                        <Text style={styles.label}>Usuário</Text>
                        <Input
                          style={styles.formInput}
                          ref={userRef}
                          accessibilityLabel="Usuário"
                          placeholder="Seu usuário"
                          value={values.username}
                          editable={!loading}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="next"
                          onChangeText={(value) => onChange('username', value)}
                          onSubmitEditing={() => passwordRef.current?.focus()}
                        />
                      </View>
                      <View style={styles.credential}>
                        <Text style={styles.label}>Senha</Text>
                        <Input
                          style={styles.formInput}
                          ref={passwordRef}
                          accessibilityLabel="Senha"
                          placeholder="Sua senha"
                          value={values.password}
                          editable={!loading}
                          secureTextEntry
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="done"
                          onChangeText={(value) => onChange('password', value)}
                          onSubmitEditing={onSubmit}
                        />
                      </View>
                    </View>
                  )}
                </View>
                {!!error && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                )}
              </ScrollView>
              <View style={styles.actions}>
                {loading && <ActivityIndicator color={colors.accent} />}
                <Button
                  title={loading ? 'Conectando…' : 'Conectar lista'}
                  primary
                  iconName="play"
                  disabled={loading}
                  onPress={onSubmit}
                  style={styles.submit}
                />
                {loading ? (
                  <Button title="Cancelar" onPress={onCancel} style={styles.back} />
                ) : (
                  onBack && <Button title={backLabel} onPress={onBack} style={styles.back} />
                )}
              </View>
            </View>
          </TVFocusGuideView>
          <Text style={styles.privacy} numberOfLines={1}>
            Suas listas, do seu jeito. O Senju não fornece conteúdo.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 28 },
  layout: { flex: 1, flexDirection: 'row', gap: 36 },
  intro: { width: '34%', paddingVertical: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  slogan: { color: colors.muted, fontSize: 11, marginTop: 5 },
  hero: { flex: 1, justifyContent: 'center', paddingBottom: 18 },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  titleAccent: { color: colors.accent },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 14, maxWidth: 280 },
  formColumn: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'center' },
  formBody: { flexGrow: 0, flexShrink: 1 },
  formGuide: { width: '100%', maxWidth: 580, alignSelf: 'center', flexShrink: 1 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, flexShrink: 1 },
  cardHeader: { gap: 12, marginBottom: 16 },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    padding: 3,
    gap: 4,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  tab: { flex: 1, minHeight: 38, margin: 0, paddingVertical: 6, paddingHorizontal: 8 },
  fields: { gap: 12 },
  formInput: { minHeight: 44, paddingVertical: 5, fontSize: 15, lineHeight: 20 },
  label: { color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: '500', marginBottom: 5 },
  credentials: { flexDirection: 'row', gap: 12 },
  credential: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, flexShrink: 0 },
  submit: { flex: 1, margin: 0, minHeight: 44, paddingVertical: 6 },
  back: { margin: 0, minHeight: 44, paddingVertical: 6, paddingHorizontal: 10 },
  error: {
    color: '#ffd0d0',
    backgroundColor: '#3b2228',
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  privacy: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 9, height: 18 },
  savedSection: { maxHeight: 176, flexShrink: 1, marginBottom: 10 },
  savedSectionShort: { maxHeight: 120, marginTop: 20 },
  savedScroll: { flexGrow: 0, flexShrink: 1 },
  sectionLabel: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 10 },
  savedRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  savedButton: { flex: 1, margin: 0, backgroundColor: colors.surface },
  removeButton: {
    margin: 0,
    width: 42,
    minHeight: 44,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
});
