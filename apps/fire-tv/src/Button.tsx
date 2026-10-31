import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTVFocus } from './useTVFocus';
import { Icon, type IconName } from './Icon';
import { colors } from './theme';

export function Button({
  title,
  onPress,
  preferred = false,
  onFocus,
  disabled = false,
  selected = false,
  primary = false,
  style,
  accessibilityLabel,
  small = false,
  focusRef,
  icon,
  quiet = false,
  expanded,
  iconName,
  iconOnly = false,
  nextFocusLeft,
}: {
  title: string;
  onPress: () => void;
  preferred?: boolean;
  onFocus?: () => void;
  disabled?: boolean;
  selected?: boolean;
  primary?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  small?: boolean;
  icon?: React.ReactNode;
  quiet?: boolean;
  expanded?: boolean;
  iconName?: IconName;
  iconOnly?: boolean;
  nextFocusLeft?: number;
  focusRef?: React.RefObject<View | null>;
}) {
  const internalRef = useRef<View>(null);
  const ref = focusRef || internalRef;
  const { focused, updateFocus } = useTVFocus(ref, onFocus);
  useEffect(() => {
    if (!preferred || disabled) return;
    const frame = requestAnimationFrame(() => ref.current?.requestTVFocus());
    return () => cancelAnimationFrame(frame);
  }, [preferred, disabled]);
  return (
    <Pressable
      ref={ref}
      nextFocusLeft={nextFocusLeft}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled, selected, expanded }}
      disabled={disabled}
      focusable={!disabled}
      isTVSelectable={!disabled}
      hasTVPreferredFocus={preferred && !disabled}
      onFocus={() => updateFocus(true)}
      onBlur={() => updateFocus(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        title.length <= 2 && styles.compactButton,
        primary && styles.primary,
        selected && styles.selected,
        small && styles.small,
        quiet && styles.quiet,
        quiet && selected && styles.quietSelected,
        style,
        focused && styles.focus,
        focused && quiet && styles.quietFocus,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content} pointerEvents="none">
        {iconName && (
          <Icon
            name={iconName}
            size={18}
            color={primary && !focused ? colors.onAccent : colors.text}
          />
        )}
        {icon ||
          (!iconOnly && (
            <Text
              numberOfLines={small ? 1 : 2}
              style={[
                styles.text,
                small && styles.smallText,
                quiet && { textAlign: 'left' },
                title.length > 2 && styles.growText,
                primary && styles.primaryText,
                selected && styles.selectedText,
                focused && styles.focusText,
              ]}
            >
              {title}
            </Text>
          ))}
        {expanded !== undefined && (
          <Icon
            name={expanded ? 'down' : 'right'}
            size={14}
            color={focused ? colors.text : colors.muted}
          />
        )}
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.raised,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    margin: 3,
    minHeight: 46,
    justifyContent: 'center',
  },
  small: { minHeight: 40, paddingVertical: 6, paddingHorizontal: 12, margin: 2 },
  smallText: { fontSize: 13, lineHeight: 18 },
  quiet: { backgroundColor: 'transparent', borderColor: 'transparent' },
  quietSelected: { backgroundColor: colors.selected },
  quietFocus: { borderColor: colors.focus, backgroundColor: '#204c33' },
  primary: { backgroundColor: colors.accent },
  selected: { backgroundColor: colors.selected },
  focus: { backgroundColor: '#204c33', borderColor: colors.focus },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: 9,
  },
  pressed: { opacity: 0.75 },
  growText: { flexGrow: 1, flexShrink: 1 },
  compactButton: { minWidth: 40, paddingHorizontal: 7 },
  text: { color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  primaryText: { color: colors.onAccent },
  selectedText: { color: colors.focus },
  focusText: { color: colors.text, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
