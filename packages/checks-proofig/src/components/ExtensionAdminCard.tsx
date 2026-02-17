import type { ExtensionAdminCardProps } from '@curvenote/scms-core';

function ExtensionAdminCard({ config, extensionName, ExtensionIcon }: ExtensionAdminCardProps) {
  const proofigSubmitMode = config.proofigSubmitMode as string | undefined;
  const proofigApiBaseUrl = config.proofigApiBaseUrl as string | undefined;
  const proofigNotifyBaseUrl = config.proofigNotifyBaseUrl as string | undefined;
  const proofigSubmitTopic = config.proofigSubmitTopic as string | undefined;

  return (
    <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2 md:items-start md:gap-2">
      <div className="flex gap-3 items-center min-w-0">
        {ExtensionIcon && <ExtensionIcon className="w-6 h-6 shrink-0" />}
        <h2 className="text-xl font-semibold capitalize">{extensionName}</h2>
      </div>
      <div className="space-y-4">
        {proofigSubmitMode && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Submit mode</p>
            <p className="text-sm">{proofigSubmitMode}</p>
          </div>
        )}
        {proofigApiBaseUrl && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">API base URL</p>
            <p className="text-sm break-all">{proofigApiBaseUrl}</p>
          </div>
        )}
        {proofigNotifyBaseUrl && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Notify base URL</p>
            <p className="text-sm break-all">{proofigNotifyBaseUrl}</p>
          </div>
        )}
        {proofigSubmitTopic && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Submit topic</p>
            <p className="text-sm">{proofigSubmitTopic}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExtensionAdminCard;
