import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@tanstack/react-router';
import { MailIcon } from 'lucide-react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  Form,
  FormField,
  FormFieldController,
  FormFieldLabel,
} from '@/components/form';
import { Button } from '@/components/ui/button';

import { authClient } from '@/features/auth/client';
import { useMascot } from '@/features/auth/mascot';
import { FormFieldsLogin, zFormFieldsLogin } from '@/features/auth/schema';
import { LoginEmailHint } from '@/features/devtools/login-hint';

export default function PageLogin({
  search,
}: {
  search: { redirect?: string };
}) {
  const { t } = useTranslation(['auth', 'common']);
  const router = useRouter();

  const form = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(zFormFieldsLogin()),
    defaultValues: {
      email: '',
    },
  });

  const { isValid, isSubmitted } = form.formState;
  useMascot({ isError: !isValid && isSubmitted });

  const submitHandler: SubmitHandler<FormFieldsLogin> = async ({ email }) => {
    let result;
    try {
      result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      });
    } catch {
      toast.error(t('auth:errorCode.UNKNOWN_ERROR'));
      return;
    }

    if (result.error) {
      const errorMessage = result.error.code
        ? t(
            `auth:errorCode.${result.error.code as unknown as keyof typeof authClient.$ERROR_CODES}`
          )
        : (typeof result.error.message === 'string' && result.error.message) ||
          t('auth:errorCode.UNKNOWN_ERROR');
      toast.error(errorMessage);
      return;
    }

    router.navigate({
      replace: true,
      to: '/login/verify',
      search: {
        redirect: search.redirect,
        email,
      },
    });
  };

  return (
    <Form {...form} onSubmit={submitHandler} className="flex flex-col gap-7">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl leading-tight font-bold text-balance">
          {t('auth:pageLogin.title')}
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-6 text-balance text-muted-foreground">
          {t('auth:pageLogin.description')}
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-4">
          <FormField>
            <FormFieldLabel className="font-medium">
              {t('auth:common.email.label')}
            </FormFieldLabel>
            <FormFieldController
              type="email"
              control={form.control}
              name="email"
              size="lg"
              placeholder={t('auth:common.email.label')}
              autoComplete="email"
            />
          </FormField>
          <Button
            loading={form.formState.isSubmitting}
            type="submit"
            size="lg"
            className="h-11 w-full"
          >
            <MailIcon />
            {t('auth:pageLogin.loginWithEmail')}
          </Button>
          <LoginEmailHint />
        </div>
      </div>
    </Form>
  );
}
