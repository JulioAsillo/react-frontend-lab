'use client';
import { CFG_A, makePrivilegiadosPanel } from './makePrivilegiadosPanel';

const SysAdminPanel = makePrivilegiadosPanel({
  label:      'Hallazgos SysAdmin',
  endpoint:   '/privilegiados/hallazgos-sysadmin',
  persistKey: 'priv-sysadmin',
  breadcrumb: 'sysadmin',
  scenarioCfg: CFG_A,
});

export default SysAdminPanel;
