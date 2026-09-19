import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { ProductMultiSelect } from './ProductMultiSelect';
import { useRegistry } from '../contexts/RegistryContext';
import type {
  AutomationRule,
  LifecycleTemplate,
  StageDef,
  WorkItemTypeDef,
} from '../types/registry';
import {
  LIFECYCLE_TEMPLATES,
  normalizeRuleWhen,
  requirementsForLifecycle,
  syncLegacyFromTypes,
  templateToLifecycleDraft,
} from '../types/registry';
import { newRuleId } from '../lib/automationCatalog';
import {
  AutomationRulesEditor,
  StageListEditor,
  WorkItemTypesEditor,
  slugifyTypeId,
} from './LifecycleModal';

export type TemplateModalMode = 'create' | 'edit' | 'view';

export function LifecycleTemplateModal({
  open,
  onClose,
  mode,
  template = null,
}: {
  open: boolean;
  onClose: () => void;
  mode: TemplateModalMode;
  template?: LifecycleTemplate | null;
}) {
  const { addLifecycleTemplate, updateLifecycleTemplate } = useRegistry();
  const readOnly = mode === 'view';
  const isEdit = mode === 'edit' && !!template;

  const [label, setLabel] = useState('');
  const [summary, setSummary] = useState('');
  const [stages, setStages] = useState<StageDef[]>(LIFECYCLE_TEMPLATES.delivery.stages);
  const [workItemTypes, setWorkItemTypes] = useState<WorkItemTypeDef[]>(
    LIFECYCLE_TEMPLATES.delivery.workItemTypes
  );
  const [productIds, setProductIds] = useState<string[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(
    LIFECYCLE_TEMPLATES.delivery.automationRules
  );

  useEffect(() => {
    if (!open) return;
    if (template) {
      const draft = templateToLifecycleDraft(template);
      setLabel(draft.label);
      setSummary(draft.summary);
      setStages(draft.stages.map((s) => ({ ...s })));
      setWorkItemTypes(
        (draft.workItemTypes ?? []).map((t) => ({
          ...t,
          stages: t.stages.map((s) => ({ ...s })),
        }))
      );
      setProductIds(template.productIds ?? []);
      setAutomationRules(
        (draft.automationRules ?? []).map((r) => ({
          ...r,
          when: normalizeRuleWhen(r),
        }))
      );
    } else {
      const tpl = LIFECYCLE_TEMPLATES.delivery;
      setLabel('');
      setSummary('');
      setStages(tpl.stages.map((s) => ({ ...s })));
      setWorkItemTypes(
        tpl.workItemTypes.map((t) => ({ ...t, stages: t.stages.map((s) => ({ ...s })) }))
      );
      setProductIds([]);
      setAutomationRules(
        tpl.automationRules.map((r) => ({
          ...r,
          id: newRuleId(),
          when: normalizeRuleWhen(r),
        }))
      );
    }
  }, [open, template]);

  const draftForReqs = useMemo(
    () =>
      ({
        id: '_',
        label: '',
        summary: '',
        decomposition: 'delivery' as const,
        stages,
        storyStages: workItemTypes.find((t) => t.id === 'story')?.stages ?? [],
        workItemTypes,
        productIds: [],
        automationRules: [],
      }),
    [stages, workItemTypes]
  );

  const requirementOptions = requirementsForLifecycle(draftForReqs);
  const storyStages =
    workItemTypes.find((t) => t.id === 'story')?.stages ??
    workItemTypes.flatMap((t) => t.stages);

  const valid =
    label.trim().length > 1 &&
    stages.length > 0 &&
    stages.every((s) => s.name.trim().length > 0) &&
    workItemTypes.every((t) => t.id.trim().length > 0 && t.label.trim().length > 0);

  function submit() {
    if (readOnly || !valid) return;
    if (template?.isSystem && mode === 'edit') {
      // Allow updating content of system templates but keep isSystem
    }
    const legacy = syncLegacyFromTypes({ workItemTypes, stages });
    const payload = {
      label: label.trim(),
      summary: summary.trim(),
      decomposition: legacy.decomposition,
      stages: stages.map((s) => ({
        ...s,
        name: s.name.trim(),
        contentMode: s.contentMode ?? 'inline',
        opensTypeId:
          (s.contentMode ?? 'inline') === 'table' ? s.opensTypeId ?? null : null,
      })),
      storyStages: legacy.storyStages.map((s) => ({ ...s, name: s.name.trim() })),
      workItemTypes: workItemTypes.map((t) => ({
        ...t,
        id: slugifyTypeId(t.id) || t.id,
        label: t.label.trim(),
        pluralLabel: t.pluralLabel.trim() || `${t.label.trim()}s`,
        stages: t.stages.map((s) => ({ ...s, name: s.name.trim() })),
      })),
      productIds,
      automationRules: automationRules.map((r) => ({
        ...r,
        when: normalizeRuleWhen(r),
      })),
    };
    if (isEdit && template) {
      updateLifecycleTemplate(template.id, payload);
    } else {
      addLifecycleTemplate(payload);
    }
    onClose();
  }

  const title =
    mode === 'view'
      ? `Template · ${template?.label ?? ''}`
      : isEdit
        ? 'Edit template'
        : 'Add a template';

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-3xl"
      title={title}
      subtitle={
        template
          ? `${template.id}${template.isSystem ? ' · system' : ''}`
          : 'Reusable lifecycle configuration'
      }
      footer={
        readOnly ? (
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={!valid}>
              {isEdit ? 'Save template' : 'Add template'}
            </Button>
          </>
        )
      }
    >
      <div className={`space-y-5 ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
        <Field label="Template name" required>
          <input
            className={inputClass}
            value={label}
            readOnly={readOnly}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Platform delivery template"
          />
        </Field>
        {!readOnly && (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-soft">
              Products <span className="font-normal text-mute">(optional — empty = company-wide)</span>
            </span>
            <ProductMultiSelect
              productIds={productIds}
              onChange={setProductIds}
              emptyHint="No products yet. Leave empty for a company-wide template."
            />
          </div>
        )}
        {readOnly && (
          <Field label="Product scope">
            <p className="text-xs text-mute">
              {productIds.length === 0
                ? 'Company-wide (all products)'
                : productIds.join(', ')}
            </p>
          </Field>
        )}
        <Field label="Summary">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={summary}
            readOnly={readOnly}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What this template is for."
          />
        </Field>

        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="quiet"
              type="button"
              onClick={() => {
                const tpl = LIFECYCLE_TEMPLATES.delivery;
                setStages(tpl.stages.map((s) => ({ ...s })));
                setWorkItemTypes(
                  tpl.workItemTypes.map((t) => ({
                    ...t,
                    stages: t.stages.map((s) => ({ ...s })),
                  }))
                );
                setAutomationRules(
                  tpl.automationRules.map((r) => ({
                    ...r,
                    id: newRuleId(),
                    when: normalizeRuleWhen(r),
                  }))
                );
                if (!label.trim()) setLabel(tpl.label);
                if (!summary.trim()) setSummary(tpl.summary);
              }}
            >
              Start from delivery
            </Button>
            <Button
              variant="quiet"
              type="button"
              onClick={() => {
                const tpl = LIFECYCLE_TEMPLATES.none;
                setStages(tpl.stages.map((s) => ({ ...s })));
                setWorkItemTypes([]);
                setAutomationRules(
                  tpl.automationRules.map((r) => ({
                    ...r,
                    id: newRuleId(),
                    when: normalizeRuleWhen(r),
                  }))
                );
                if (!label.trim()) setLabel(tpl.label);
                if (!summary.trim()) setSummary(tpl.summary);
              }}
            >
              Start from hardware
            </Button>
          </div>
        )}

        <WorkItemTypesEditor
          types={workItemTypes}
          onChange={readOnly ? () => undefined : setWorkItemTypes}
        />

        <StageListEditor
          title="Capability stages"
          stages={stages}
          requirementOptions={requirementOptions}
          typeOptions={workItemTypes}
          onChange={readOnly ? () => undefined : setStages}
          withAutoStatus
          allowTableLink
        />

        <AutomationRulesEditor
          rules={automationRules}
          lifecycleDraft={{ stages, storyStages, workItemTypes }}
          onChange={readOnly ? () => undefined : setAutomationRules}
        />
      </div>
    </Modal>
  );
}
