import { existsSync, accessSync, constants } from 'node:fs';
import { platform, release } from 'node:os';
const kvm = (() => {
  try {
    accessSync('/dev/kvm', constants.R_OK | constants.W_OK);
    return true;
  } catch {
    return false;
  }
})();
console.log(
  JSON.stringify(
    {
      os: platform(),
      kernel: release(),
      kvm,
      display: !!process.env.DISPLAY,
      webos_simulator: process.env.SENJU_WEBOS_SIMULATOR || null,
      webos_simulator_exists:
        !!process.env.SENJU_WEBOS_SIMULATOR && existsSync(process.env.SENJU_WEBOS_SIMULATOR),
      samsung_emulator_ready: kvm,
      tv_hardware_validated: false,
      notes: [
        'Linux Samsung emulator requires supported virtualization; this check does not install drivers or enable host virtualization.',
        'LG download and simulator installation follow official portal instructions; a Chromium test does not count as an official simulator.',
      ],
    },
    null,
    2,
  ),
);
