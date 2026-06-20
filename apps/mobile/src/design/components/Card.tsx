import { Pressable, View } from 'react-native';
import type { PressableProps, ViewProps } from 'react-native';
import { colors } from '../tokens';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: 16,
          padding: 14,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

interface PressableCardProps extends PressableProps {
  children: React.ReactNode;
}

export function PressableCard({ children, style, ...rest }: PressableCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: 16,
          padding: 14,
          opacity: pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? undefined : style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
