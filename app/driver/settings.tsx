import React from 'react';
import { Header, Screen } from '@/components/ui';
import { RoleSettings } from '@/components/RoleSettings';

export default function DriverSettings() {
  return (<><Header title="Pengaturan" /><Screen><RoleSettings /></Screen></>);
}
