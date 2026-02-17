import type { ExtensionAdminCardProps } from '@curvenote/scms-core';

function ExtensionAdminCard({ config, extensionName, ExtensionIcon }: ExtensionAdminCardProps) {
  const submitMode = config.submitMode as string | undefined;
  const apiBaseUrl = config.apiBaseUrl as string | undefined;
  const notifyBaseUrl = config.notifyBaseUrl as string | undefined;
  const submitTopic = config.submitTopic as string | undefined;
  const clientId = config.clientId as string | undefined;

  return (
    <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2 md:items-start md:gap-2">
      <div className="flex gap-3 items-center min-w-0">
        {ExtensionIcon && <ExtensionIcon className="w-6 h-6 shrink-0" />}
        <h2 className="text-xl font-semibold capitalize">{extensionName}</h2>
      </div>
      <div className="space-y-4">
        {submitMode && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Submit mode</p>
            <p className="text-sm">{submitMode}</p>
          </div>
        )}
        {apiBaseUrl && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">API base URL</p>
            <p className="text-sm break-all">{apiBaseUrl}</p>
          </div>
        )}
        {notifyBaseUrl && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Notify base URL</p>
            <p className="text-sm break-all">{notifyBaseUrl}</p>
          </div>
        )}
        {submitTopic && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Submit topic</p>
            <p className="text-sm">{submitTopic}</p>
          </div>
        )}
        {clientId && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Client ID</p>
            <p className="text-sm break-all">{clientId}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExtensionAdminCard;
