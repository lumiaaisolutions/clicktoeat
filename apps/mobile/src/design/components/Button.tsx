import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { PressableProps } from 'react-native';
import { colors } from '../tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  size = 'md',
  disabled,
  ...rest
}: ButtonProps) {
  const bg =
    variant === 'primary' ? colors.ink :
    variant === 'danger'  ? colors.accent :
    variant === 'ghost'   ? 'transparent' :
                            colors.surface;

  const fg =
    variant === 'primary' || variant === 'danger' ? '#FFFFFF' :
    colors.ink;

  const border =
    variant === 'secondary' ? colors.line :
    variant === 'ghost'     ? 'transparent' :
                              bg;

  const pad = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 17 : 15;

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: bg,
        opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
        borderColor: border,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: pad,
        paddingHorizontal: 18,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
      })}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: fg, fontSize, fontWeight: '600' }}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
