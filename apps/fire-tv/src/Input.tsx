import React, { forwardRef, useCallback, useRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTVFocus } from './useTVFocus';
import { colors } from './theme';
import { Icon, type IconName } from './Icon';

export const Input = forwardRef<TextInput, TextInputProps & { leadingIcon?: IconName }>(
  function Input(
    { style, onFocus, onBlur, accessibilityLabel, placeholderTextColor, leadingIcon, ...props },
    ref,
  ) {
    const inputRef = useRef<TextInput>(null);
    const { focused, updateFocus } = useTVFocus(inputRef);
    const attachRef = useCallback(
      (input: TextInput | null) => {
        inputRef.current = input;
        if (typeof ref === 'function') ref(input);
        else if (ref) ref.current = input;
      },
      [ref],
    );
    return (
      <View style={styles.wrapper} collapsable={false}>
        <TextInput
          {...props}
          ref={attachRef}
          accessibilityLabel={accessibilityLabel || props.placeholder}
          selectionColor={colors.accent}
          placeholderTextColor={placeholderTextColor || colors.muted}
          underlineColorAndroid="transparent"
          onFocus={(event) => {
            updateFocus(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            updateFocus(false);
            onBlur?.(event);
          }}
          style={[styles.input, leadingIcon && { paddingLeft: 38 }, style, focused && styles.focus]}
        />
        {leadingIcon && (
          <View
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
            style={styles.pointer}
          >
            <Icon name={leadingIcon} size={17} color={focused ? colors.focus : colors.muted} />
          </View>
        )}
      </View>
    );
  },
);
const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  pointer: { position: 'absolute', left: 13, top: 0, bottom: 0, justifyContent: 'center' },
  input: {
    minHeight: 44,
    borderWidth: 2,
    borderColor: colors.stroke,
    borderRadius: 10,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  focus: { borderColor: colors.focus, backgroundColor: '#172d20', color: colors.text },
});
