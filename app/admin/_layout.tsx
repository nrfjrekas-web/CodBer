import React from 'react';
import { RoleTabs } from '@/components/RoleTabs';

export default function AdminLayout() {
  return (
    <RoleTabs role="admin" hidden={['order/[id]', 'zones', 'audit']} tabs={[
      { name: 'index', title: 'Dasbor', icon: 'grid-outline', iconOn: 'grid' },
      { name: 'applications', title: 'Pengajuan', icon: 'document-text-outline', iconOn: 'document-text' },
      { name: 'orders', title: 'Pesanan', icon: 'receipt-outline', iconOn: 'receipt' },
      { name: 'partners', title: 'Mitra', icon: 'people-outline', iconOn: 'people' },
      { name: 'reports', title: 'Laporan', icon: 'bar-chart-outline', iconOn: 'bar-chart' },
    ]} />
  );
}
