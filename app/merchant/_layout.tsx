import React from 'react';
import { RoleTabs } from '@/components/RoleTabs';

export default function MerchantLayout() {
  return (
    <RoleTabs role="merchant" hidden={['order/[id]', 'product-form']} tabs={[
      { name: 'index', title: 'Dashboard', icon: 'storefront-outline', iconOn: 'storefront' },
      { name: 'orders', title: 'Pesanan', icon: 'receipt-outline', iconOn: 'receipt' },
      { name: 'products', title: 'Produk', icon: 'cube-outline', iconOn: 'cube' },
      { name: 'reports', title: 'Laporan', icon: 'bar-chart-outline', iconOn: 'bar-chart' },
      { name: 'settings', title: 'Pengaturan', icon: 'settings-outline', iconOn: 'settings' },
    ]} />
  );
}
