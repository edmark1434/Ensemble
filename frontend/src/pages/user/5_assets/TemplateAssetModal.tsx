import { AssetListingModal, type AssetEditorModalProps, type TemplateDraft } from "./AssetEditorModal";

export default function TemplateAssetModal({ snapshot, ...props }: AssetEditorModalProps & { snapshot?: TemplateDraft }) {
  if (!props.open) return null;
  return <AssetListingModal {...props} template={snapshot} />;
}
