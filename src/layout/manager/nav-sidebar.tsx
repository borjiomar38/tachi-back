import { Link } from '@tanstack/react-router';
import {
  ActivityIcon,
  BookOpenTextIcon,
  CpuIcon,
  InboxIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  PanelLeftIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Logo } from '@/components/brand/logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

import {
  permissionContact,
  permissionJob,
  permissionLicense,
  permissionProvider,
  permissionStaff,
} from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import { NavUser } from '@/layout/manager/nav-user';

export const NavSidebar = (props: { children?: ReactNode }) => {
  const { t } = useTranslation(['layout']);
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-auto"
                  render={
                    <Link to="/manager">
                      <span>
                        <Logo className="w-24 group-data-[collapsible=icon]:w-18" />
                      </span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarTrigger
              className="group-data-[collapsible=icon]:hidden"
              icon={
                <>
                  <XIcon className="md:hidden" />
                  <PanelLeftIcon className="hidden md:block rtl:rotate-180" />
                </>
              }
            />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t('layout:nav.application')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link to="/manager/dashboard">
                    {({ isActive }) => (
                      <SidebarMenuButton
                        isActive={isActive}
                        render={
                          <span>
                            <LayoutDashboardIcon />
                            <span>{t('layout:nav.dashboard')}</span>
                          </span>
                        }
                      />
                    )}
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <WithPermissions
            permissions={[permissionLicense.read, permissionContact.read]}
          >
            <SidebarGroup>
              <SidebarGroupLabel>{t('layout:nav.support')}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <WithPermissions permissions={[permissionContact.read]}>
                    <SidebarMenuItem>
                      <Link to="/manager/contacts">
                        {({ isActive }) => (
                          <SidebarMenuButton
                            isActive={isActive}
                            render={
                              <span>
                                <InboxIcon />
                                <span>{t('layout:nav.contacts')}</span>
                              </span>
                            }
                          />
                        )}
                      </Link>
                    </SidebarMenuItem>
                  </WithPermissions>
                  <SidebarMenuItem>
                    <Link to="/manager/licenses">
                      {({ isActive }) => (
                        <SidebarMenuButton
                          isActive={isActive}
                          render={
                            <span>
                              <KeyRoundIcon />
                              <span>{t('layout:nav.licenses')}</span>
                            </span>
                          }
                        />
                      )}
                    </Link>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </WithPermissions>
          <WithPermissions
            permissions={[permissionJob.read, permissionProvider.read]}
          >
            <SidebarGroup>
              <SidebarGroupLabel>
                {t('layout:nav.operations')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <WithPermissions permissions={[permissionJob.read]}>
                    <SidebarMenuItem>
                      <Link to="/manager/chapters">
                        {({ isActive }) => (
                          <SidebarMenuButton
                            isActive={isActive}
                            render={
                              <span>
                                <BookOpenTextIcon />
                                <span>{t('layout:nav.chapters')}</span>
                              </span>
                            }
                          />
                        )}
                      </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <Link to="/manager/jobs">
                        {({ isActive }) => (
                          <SidebarMenuButton
                            isActive={isActive}
                            render={
                              <span>
                                <ActivityIcon />
                                <span>{t('layout:nav.jobs')}</span>
                              </span>
                            }
                          />
                        )}
                      </Link>
                    </SidebarMenuItem>
                  </WithPermissions>
                  <WithPermissions permissions={[permissionProvider.read]}>
                    <SidebarMenuItem>
                      <Link to="/manager/providers">
                        {({ isActive }) => (
                          <SidebarMenuButton
                            isActive={isActive}
                            render={
                              <span>
                                <CpuIcon />
                                <span>{t('layout:nav.providers')}</span>
                              </span>
                            }
                          />
                        )}
                      </Link>
                    </SidebarMenuItem>
                  </WithPermissions>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </WithPermissions>
          <WithPermissions permissions={[permissionStaff.list]}>
            <SidebarGroup>
              <SidebarGroupLabel>
                {t('layout:nav.configuration')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <Link to="/manager/users">
                      {({ isActive }) => (
                        <SidebarMenuButton
                          isActive={isActive}
                          render={
                            <span>
                              <UsersIcon />
                              <span>{t('layout:nav.users')}</span>
                            </span>
                          }
                        />
                      )}
                    </Link>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </WithPermissions>
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{props.children}</SidebarInset>
    </SidebarProvider>
  );
};
