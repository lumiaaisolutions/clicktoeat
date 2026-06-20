import { forwardRef, useState } from 'react';
import { TextInput, View, Text } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors } from '../tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? (
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 6, fontWeight: '500' }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? colors.accent : focused ? colors.ink : colors.line,
            backgroundColor: colors.surface,
            color: colors.ink,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 12,
            fontSize: 16,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={{ fontSize: 12, color: colors.accent, marginTop: 4 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{hint}</Text>
      ) : null}
    </View>
  );
});
