import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTVFocus } from './useTVFocus';
import { Icon, type IconName } from './Icon';
import { colors } from './theme';

type PlayerIcon =
  | 'play'
  | 'pause'
  | 'rewind'
  | 'forward'
  | 'back'
  | 'hide'
  | 'previousEpisode'
  | 'nextEpisode';
const icons: Record<PlayerIcon, IconName> = {
  play: 'play',
  pause: 'pause',
  rewind: 'rewind',
  forward: 'forward',
  back: 'left',
  hide: 'down',
  previousEpisode: 'previous',
  nextEpisode: 'next',
};
export function PlayerControlButton({
  icon,
  label,
  onPress,
  onFocus,
  preferred = false,
  disabled = false,
  large = false,
  labelAlign,
}: {
  icon: PlayerIcon;
  label: string;
  onPress: () => void;
  onFocus: () => void;
  preferred?: boolean;
  disabled?: boolean;
  large?: boolean;
  labelAlign?: 'start' | 'end';
}) {
  const ref = useRef<View>(null);
  const { focused, updateFocus } = useTVFocus(ref, onFocus);
  useEffect(() => {
    if (!preferred || disabled) return;
    const frame = requestAnimationFrame(() => ref.current?.requestTVFocus());
    return () => cancelAnimationFrame(frame);
  }, [preferred, disabled]);
  return (
    <Pressable
      ref={ref}
      focusable={!disabled}
      isTVSelectable={!disabled}
      hasTVPreferredFocus={preferred && !disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => updateFocus(true)}
      onBlur={() => updateFocus(false)}
      style={({ pressed }) => [
        styles.button,
        large && styles.large,
        focused && styles.focus,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icons[icon]} size={large ? 27 : 22} />
      {focused && (
        <View
          pointerEvents="none"
          style={[
            styles.caption,
            labelAlign === 'start'
              ? { left: 0 }
              : labelAlign === 'end'
                ? { right: 0 }
                : { left: large ? -50 : -56 },
          ]}
        >
          <Text numberOfLines={1} style={styles.label}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.player,
    justifyContent: 'center',
    alignItems: 'center',
  },
  large: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#185236f2' },
  focus: { borderColor: colors.focus, backgroundColor: '#205b3ef5' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  caption: {
    position: 'absolute',
    bottom: -27,
    width: 160,
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: colors.player,
  },
  label: { color: colors.text, fontSize: 11, lineHeight: 15, textAlign: 'center' },
});
