import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/design/components/Button';
import { Input } from '@/design/components/Input';
import { useAuth } from '@/store/auth';
import { colors } from '@/design/tokens';
import type { AxiosError } from 'axios';

export default function LoginScreen() {
  const login = useAuth((s) => s.login);
  const loading = useAuth((s) => s.loading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    try {
      const res = await login(email.trim(), password, needs2fa ? otp.trim() : undefined);
      if (res.twoFactorRequired) {
        setNeeds2fa(true);
      }
    } catch (e) {
      const err = e as AxiosError<{ errors?: Record<string, string[]>; message?: string }>;
      const otpErr = err?.response?.data?.errors?.otp?.[0];
      if (otpErr) {
        setNeeds2fa(true);
        setError(otpErr);
        return;
      }
      const emailErr = err?.response?.data?.errors?.email?.[0];
      setError(emailErr ?? err?.response?.data?.message ?? 'No pudimos iniciar sesión.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.ink,
                letterSpacing: -0.5,
              }}
            >
              ClickToEat
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
              Panel del local
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 24,
              padding: 20,
              borderColor: colors.line,
              borderWidth: 1,
            }}
          >
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!loading}
            />
            <Input
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
            />

            {needs2fa ? (
              <Input
                label="Código 2FA"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                hint="Código de 6 dígitos de tu app autenticadora"
                editable={!loading}
              />
            ) : null}

            {error ? (
              <Text style={{ color: colors.accent, fontSize: 13, marginBottom: 12 }}>
                {error}
              </Text>
            ) : null}

            <Button label={needs2fa ? 'Verificar' : 'Entrar'} onPress={onSubmit} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
