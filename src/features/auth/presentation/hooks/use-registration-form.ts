import { useState } from 'react';
import { useAuthActions, useSession } from '../../../../composition/application-provider';
import type { RegistrationInput, RegistrationReceipt } from '../../../../core/domain/entities/registration';
import { useAuthOperation } from './use-auth-operation';

export function useRegistrationForm() {
  const auth = useAuthActions();
  const session = useSession();
  const operation = useAuthOperation();
  const [form, setForm] = useState<RegistrationInput>({
    name: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '', role: 'OWNER',
  });
  const [receipt, setReceipt] = useState<RegistrationReceipt | null>(null);
  const editable = !operation.busy && session.status === 'signed-out';
  function update<K extends keyof RegistrationInput>(key: K, value: RegistrationInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  async function submit() {
    if (!auth || !editable) return;
    await operation.run(async () => {
      const result = await auth.register(form);
      if (result.ok) {
        setReceipt(result.value);
        setForm((previous) => ({ ...previous, password: '', confirmPassword: '' }));
      }
      return result;
    });
  }
  return { canSubmit: !!auth && editable, session, operation, form, receipt, editable, update, submit };
}
