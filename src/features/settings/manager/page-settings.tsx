import { useTranslation } from 'react-i18next';

import { Form } from '@/components/form';
import { PreventNavigation } from '@/components/prevent-navigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionStaff } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import { FreeTrialSettingsSection } from '@/features/settings/manager/free-trial-settings-section';
import { OcrUploadCompressionSettingsSection } from '@/features/settings/manager/ocr-upload-compression-settings-section';
import { useSettingsPageForm } from '@/features/settings/manager/use-settings-page-form';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

export const PageSettings = () => (
  <GuardPermissions permissions={[permissionStaff.list]}>
    <PageSettingsContent />
  </GuardPermissions>
);

const PageSettingsContent = () => {
  const { t } = useTranslation(['settings']);
  const settings = useSettingsPageForm();

  return (
    <>
      <PreventNavigation shouldBlock={settings.form.formState.isDirty} />
      <Form {...settings.form} onSubmit={settings.save}>
        <PageLayout>
          <PageLayoutTopBar
            endActions={
              <WithPermissions permissions={[permissionStaff.update]}>
                <Button
                  disabled={
                    settings.isLoading ||
                    settings.isError ||
                    !settings.form.formState.isDirty
                  }
                  loading={settings.isSaving}
                  size="sm"
                  type="submit"
                >
                  {t('settings:page.save')}
                </Button>
              </WithPermissions>
            }
          >
            <PageLayoutTopBarTitle>
              {t('settings:page.title')}
            </PageLayoutTopBarTitle>
          </PageLayoutTopBar>
          <PageLayoutContent containerClassName="max-w-[1440px] py-8">
            <SettingsPageBody settings={settings} />
          </PageLayoutContent>
        </PageLayout>
      </Form>
    </>
  );
};

interface SettingsPageBodyProps {
  settings: ReturnType<typeof useSettingsPageForm>;
}

const SettingsPageBody = ({ settings }: SettingsPageBodyProps) => {
  const { t } = useTranslation(['settings']);

  if (settings.isLoading) {
    return <Spinner full className="opacity-60" />;
  }

  if (settings.isError) {
    return (
      <p className="text-sm text-negative-600">
        {t('settings:page.loadFailed')}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <FreeTrialSettingsSection />
      <OcrUploadCompressionSettingsSection
        catalog={settings.catalog}
        policyRevision={settings.policyRevision}
      />
    </div>
  );
};
