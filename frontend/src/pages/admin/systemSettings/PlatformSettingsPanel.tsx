import { DoorOpen, Globe } from 'lucide-react';
import type { FieldErrors, PlatformSettings, SettingsRules } from './settingsTypes';
import {
  NumberInput,
  SettingRow,
  SettingsCard,
  SwitchControl,
  TextInput,
  useFieldIds,
} from './settingsUi';

type Props = {
  draft: PlatformSettings;
  saved: PlatformSettings;
  defaults?: PlatformSettings;
  rules: SettingsRules['platform'];
  errors: FieldErrors;
  onChange: (next: PlatformSettings) => void;
};

function onOff(value: boolean) {
  return value ? 'On' : 'Off';
}

export default function PlatformSettingsPanel({ draft, saved, defaults, rules, errors, onChange }: Props) {
  const set = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => onChange({ ...draft, [key]: value });
  const resetTo = <K extends keyof PlatformSettings>(key: K) => (defaults ? () => set(key, defaults[key]) : undefined);
  const differsFromDefault = (key: keyof PlatformSettings) => Boolean(defaults) && !Object.is(draft[key], defaults?.[key]);

  const siteName = useFieldIds('site-name');
  const supportEmail = useFieldIds('support-email');
  const session = useFieldIds('session');
  const registration = useFieldIds('registration');
  const maintenance = useFieldIds('maintenance');

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={<Globe className="h-4 w-4" />}
        title="Identity"
        description="How the platform names itself and where members and alerts reach support."
      >
        <SettingRow
          label="Site name"
          htmlFor={siteName.input}
          description="Shown in the product and in the subject of staff alert emails."
          modified={draft.siteName !== saved.siteName}
          defaultLabel={differsFromDefault('siteName') ? defaults?.siteName : null}
          onReset={resetTo('siteName')}
          error={errors.siteName}
          errorId={siteName.error}
          control={
            <TextInput
              id={siteName.input}
              value={draft.siteName}
              onChange={(v) => set('siteName', v)}
              invalid={Boolean(errors.siteName)}
              maxLength={rules.siteName.max}
              describedBy={errors.siteName ? siteName.error : undefined}
            />
          }
        />
        <SettingRow
          label="Support email"
          htmlFor={supportEmail.input}
          description="Public contact address. Staff alerts (for example new sign-ups) are sent here too."
          modified={draft.supportEmail !== saved.supportEmail}
          defaultLabel={differsFromDefault('supportEmail') ? defaults?.supportEmail : null}
          onReset={resetTo('supportEmail')}
          error={errors.supportEmail}
          errorId={supportEmail.error}
          control={
            <TextInput
              id={supportEmail.input}
              type="email"
              value={draft.supportEmail}
              onChange={(v) => set('supportEmail', v)}
              invalid={Boolean(errors.supportEmail)}
              maxLength={rules.supportEmail.max}
              placeholder="support@example.com"
              describedBy={errors.supportEmail ? supportEmail.error : undefined}
            />
          }
        />
      </SettingsCard>

      <SettingsCard
        icon={<DoorOpen className="h-4 w-4" />}
        title="Access"
        description="Who can join, whether members can use the app, and how long they stay signed in."
      >
        <SettingRow
          label="New sign-ups"
          htmlFor={registration.input}
          description="Let new members create accounts. Existing members are not affected."
          modified={draft.registrationEnabled !== saved.registrationEnabled}
          defaultLabel={differsFromDefault('registrationEnabled') ? (defaults?.registrationEnabled ? 'Open' : 'Closed') : null}
          onReset={resetTo('registrationEnabled')}
          control={
            <SwitchControl
              id={registration.input}
              label="New sign-ups"
              checked={draft.registrationEnabled}
              onChange={(v) => set('registrationEnabled', v)}
              onText="Open"
              offText="Closed"
            />
          }
        />
        <SettingRow
          label="Maintenance mode"
          htmlFor={maintenance.input}
          description="Blocks member sign-in and the product app with a maintenance notice. Landing pages, payment webhooks and staff consoles keep working."
          modified={draft.maintenanceMode !== saved.maintenanceMode}
          defaultLabel={differsFromDefault('maintenanceMode') ? onOff(Boolean(defaults?.maintenanceMode)) : null}
          onReset={resetTo('maintenanceMode')}
          control={
            <SwitchControl
              id={maintenance.input}
              label="Maintenance mode"
              checked={draft.maintenanceMode}
              onChange={(v) => set('maintenanceMode', v)}
              onText="On — members blocked"
              offText="Off"
              tone="amber"
            />
          }
        />
        <SettingRow
          label="Idle sign-out"
          htmlFor={session.input}
          description={`Members and staff are signed out after this many days without activity, and at most ${rules.sessionTimeoutDays.max} days after signing in.`}
          modified={draft.sessionTimeoutDays !== saved.sessionTimeoutDays}
          defaultLabel={differsFromDefault('sessionTimeoutDays') ? `${defaults?.sessionTimeoutDays} days` : null}
          onReset={resetTo('sessionTimeoutDays')}
          error={errors.sessionTimeoutDays}
          errorId={session.error}
          control={
            <NumberInput
              id={session.input}
              value={draft.sessionTimeoutDays}
              onChange={(v) => set('sessionTimeoutDays', v)}
              rule={rules.sessionTimeoutDays}
              invalid={Boolean(errors.sessionTimeoutDays)}
              suffix="days"
              describedBy={errors.sessionTimeoutDays ? session.error : undefined}
            />
          }
        />
      </SettingsCard>
    </div>
  );
}
