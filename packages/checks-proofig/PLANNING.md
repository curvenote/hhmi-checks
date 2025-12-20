# ProofFig Extension Refactoring Plan

## Overview

This plan outlines the refactoring of the checks-proofig extension to properly integrate it as a first-class extension module in the Curvenote SCMS. The goal is to:

1. Properly enable/disable the extension via configuration
2. Create a check service interface/registry pattern for extensions
3. Move all ProofFig-specific code from `app/` to the extension package
4. Make the checks screen and upload screen dynamically load check services from extensions

## Current State

### Extension Registration
- Extension is registered in `app/extensions/client.ts` and `app/extensions/server.ts`
- Extension schema exists at `packages/checks-proofig/extension.schema.yml` but is not properly integrated
- Extension schema is referenced in `.app-config.schema.yml` but the extension is always available (not checked)

### Code Location
- **Extension package** (`packages/checks-proofig/`):
  - Exports icons and task card
  - Has basic client/server extension structure
  - Does NOT contain the main UI components or action handlers

- **Main app** (`app/routes/app/works.$workId.checks/`):
  - Contains `proofig/` folder with all ProofFig UI components
  - Contains ProofFig-specific action handler in `route.tsx`
  - Hard-coded import of `ImageIntegrityChecksSection`

- **Upload screen** (`app/routes/app/works.$workId.upload.$workVersionId/`):
  - Hard-coded checkboxes in `WorkUploadChecksForm.tsx`
  - Includes `proofig` as a static option

### Missing Infrastructure
- No check service interface/registry pattern
- No way to discover available check services from extensions
- No dynamic loading of check sections on checks screen
- No dynamic generation of check options on upload screen

## Architecture

### Check Service Interface

Following the pattern of other extension capabilities (tasks, icons, analytics, emails, routes), we'll create a check service interface:

```typescript
// In @curvenote/scms-core
export interface ExtensionCheckService {
  id: string; // e.g., 'proofig', 'curvenote-structure'
  name: string; // Display name
  description: string; // Display description
  // Client-side component to render on checks screen
  checksSectionComponent: React.ComponentType<{ metadata: WorkVersionMetadata & ChecksMetadataSection }>;
  // Optional: Server-side action handler
  handleAction?: (args: {
    intent: string;
    formData: FormData;
    workVersionId: string;
    metadata: WorkVersionMetadata & ChecksMetadataSection;
  }) => Promise<Response>;
}
```

### Extension Schema Updates

1. **Update `extension.schema.yml`** to include a `checks` boolean flag:
```yaml
checks:
  type: boolean
  description: This extension will register one or more check services
  default: true
```

2. **Update `ExtensionConfig` interface** in `packages/scms-core/src/modules/extensions/types.ts`:
```typescript
export interface ExtensionConfig {
  // ... existing fields
  checks?: boolean;
}
```

3. **Update `ClientExtension` interface** to include `getChecks()`:
```typescript
export interface ClientExtension {
  // ... existing fields
  getChecks?: () => ExtensionCheckService[];
}
```

4. **Update `ServerExtension` interface** similarly:
```typescript
export interface ServerExtension extends ClientExtension {
  // ... existing fields
  getChecks?: () => ExtensionCheckService[];
}
```

### Check Service Registry

Create utility functions to:
- Collect all check services from enabled extensions
- Filter by extension configuration
- Provide check services to routes/components

Location: `packages/scms-core/src/modules/extensions/checks.ts`

```typescript
export function getExtensionCheckServices(
  appConfig: AppConfig,
  extensions: ClientExtension[]
): ExtensionCheckService[] {
  const services: ExtensionCheckService[] = [];
  for (const ext of extensions) {
    const extCfg = getExtensionConfig(appConfig, ext.id);
    if (!extCfg) continue;
    if (extCfg.checks && ext.getChecks) {
      services.push(...ext.getChecks());
    }
  }
  return services;
}
```

## Implementation Plan

### Phase 1: Extension Schema Integration

**Goal:** Properly integrate checks-proofig extension schema and enable/disable it via configuration.

1. **Update extension schema** (`packages/checks-proofig/extension.schema.yml`):
   - Add `checks` boolean property (default: true)
   - Update description to mention check services

2. **Verify schema reference** in `.app-config.schema.yml`:
   - Ensure `checks-proofig` is properly referenced
   - Verify schema validation works

3. **Update TypeScript types**:
   - Add `checks-proofig` extension config type to `types/app-config.d.ts`
   - Ensure type safety for extension configuration

### Phase 2: Create Check Service Interface

**Goal:** Define the check service interface and registry pattern.

1. **Define interfaces** in `packages/scms-core/src/modules/extensions/types.ts`:
   - Add `ExtensionCheckService` interface
   - Add `getChecks()` to `ClientExtension` and `ServerExtension`
   - Add `checks?: boolean` to `ExtensionConfig`

2. **Create registry utilities** in `packages/scms-core/src/modules/extensions/checks.ts`:
   - `getExtensionCheckServices()` function
   - Helper functions for filtering/querying check services
   - Export from appropriate index files

3. **Update extension type definitions**:
   - Ensure all extension-related types are exported
   - Add JSDoc comments for new interfaces

### Phase 3: Move ProofFig Code to Extension Package

**Goal:** Move all ProofFig-specific code from `app/` to the extension package.

1. **Move UI components** from `app/routes/app/works.$workId.checks/proofig/`:
   - Move entire `proofig/` folder to `packages/checks-proofig/src/components/`
   - Update all imports within moved files
   - Ensure components are properly exported

2. **Move action handler logic**:
   - Extract ProofFig action handler from `app/routes/app/works.$workId.checks/route.tsx`
   - Create `packages/checks-proofig/src/server/actions.ts`
   - Export action handler function

3. **Move schema/types**:
   - Move ProofFig-specific schemas from `app/routes/app/works.$workId.upload.$workVersionId/checks.schema.ts`
   - Create `packages/checks-proofig/src/schema.ts`
   - Re-export from extension package
   - Update main app to import from extension package

4. **Update extension exports**:
   - Update `packages/checks-proofig/src/client.ts` to export check service
   - Update `packages/checks-proofig/src/server.ts` to export action handler
   - Ensure proper exports in `index.ts`

### Phase 4: Register Check Service in Extension

**Goal:** Implement check service registration in checks-proofig extension.

1. **Create check service component wrapper**:
   - Create `packages/checks-proofig/src/components/ImageIntegrityChecksSection.tsx`
   - Wrap existing component with proper props interface
   - Handle extension-specific logic

2. **Implement `getChecks()` in client extension**:
   - Add `getChecks()` function to `packages/checks-proofig/src/client.ts`
   - Return check service with component reference
   - Ensure proper TypeScript types

3. **Implement action handler in server extension**:
   - Add action handler to `packages/checks-proofig/src/server.ts`
   - Handle `proofig-initial-post` intent
   - Return proper response format

4. **Update extension registration**:
   - Ensure extension properly exports check service
   - Verify extension is properly typed

### Phase 5: Update Checks Screen

**Goal:** Make checks screen dynamically load check sections from registered extensions.

1. **Update checks route loader** (`app/routes/app/works.$workId.checks/route.tsx`):
   - Remove hard-coded ProofFig action handler
   - Load check services from extensions
   - Pass check services to component via loader data

2. **Update checks route component**:
   - Remove hard-coded `ImageIntegrityChecksSection` import
   - Dynamically render check sections from registered services
   - Always show `CurvenoteStructureChecksSection` (core check)
   - Conditionally show extension check sections

3. **Handle actions dynamically**:
   - Route actions to appropriate check service handlers
   - Maintain backward compatibility during transition

### Phase 6: Update Upload Screen

**Goal:** Make upload screen dynamically generate check options from registered check services.

1. **Update upload route loader**:
   - Load check services from extensions
   - Pass available check services to component

2. **Update `WorkUploadChecksForm` component**:
   - Remove hard-coded check options
   - Dynamically generate checkboxes from registered check services
   - Maintain `curvenote-structure` as always enabled (core check)
   - Allow toggling of extension-provided checks

3. **Update check schema**:
   - Ensure `workVersionCheckNameSchema` can be extended
   - Consider making it more flexible for extension-provided checks

### Phase 7: Testing & Cleanup

**Goal:** Ensure everything works and clean up any remaining issues.

1. **Test extension enable/disable**:
   - Verify checks-proofig extension can be disabled via config
   - Verify checks screen doesn't show ProofFig when disabled
   - Verify upload screen doesn't show ProofFig option when disabled

2. **Test dynamic loading**:
   - Verify all check sections render correctly
   - Verify actions work correctly
   - Verify check toggling works on upload screen

3. **Clean up**:
   - Remove any unused imports
   - Remove any commented-out code
   - Update documentation
   - Verify no TypeScript errors

4. **Update extension README**:
   - Document check service registration
   - Document configuration options
   - Add usage examples

## File Changes Summary

### New Files
- `packages/scms-core/src/modules/extensions/checks.ts` - Check service registry utilities
- `packages/checks-proofig/src/components/` - All ProofFig UI components (moved from app/)
- `packages/checks-proofig/src/server/actions.ts` - ProofFig action handlers
- `packages/checks-proofig/src/schema.ts` - ProofFig-specific schemas

### Modified Files
- `packages/checks-proofig/extension.schema.yml` - Add `checks` property
- `packages/scms-core/src/modules/extensions/types.ts` - Add check service interfaces
- `packages/checks-proofig/src/client.ts` - Add `getChecks()` implementation
- `packages/checks-proofig/src/server.ts` - Add action handler
- `app/routes/app/works.$workId.checks/route.tsx` - Dynamic check loading
- `app/routes/app/works.$workId.upload.$workVersionId/route.tsx` - Dynamic check options
- `app/routes/app/works.$workId.upload.$workVersionId/WorkUploadChecksForm.tsx` - Dynamic checkboxes
- `app/routes/app/works.$workId.upload.$workVersionId/checks.schema.ts` - Import from extension
- `types/app-config.d.ts` - Add checks-proofig config type

### Files to Leave Unchanged
- `app/routes/app/works.$workId.checks/TextIntegrityChecksSection.tsx` - Leave as-is per requirements

## Key Design Decisions

1. **Check Service ID Mapping**: Check service IDs (e.g., `'proofig'`) map directly to check names in metadata. This maintains consistency with existing `WorkVersionCheckName` type.

2. **Core vs Extension Checks**: `curvenote-structure` remains a core check always shown. Extension checks are conditionally shown based on extension configuration.

3. **Action Handling**: Actions are routed to check service handlers when available, falling back to route-level handlers for backward compatibility.

4. **Schema Location**: ProofFig-specific schemas move to the extension package, but the main checks schema remains in the app for core checks.

5. **Component Props**: Check section components receive metadata as props, allowing them to access check-specific status data.

## Open Questions

1. **Check Name Validation**: Should we make `workVersionCheckNameSchema` more flexible to allow extension-provided check names, or keep it strict with known values?

2. **Action Intent Namespacing**: Should action intents be namespaced (e.g., `proofig:initial-post`) to avoid conflicts, or is the current pattern sufficient?

3. **Check Dependencies**: Should we support check dependencies (e.g., one check requires another)? Not needed for initial implementation.

4. **Check Configuration**: Should individual check services support configuration options beyond enable/disable? Not needed for initial implementation.

## Success Criteria

- [ ] checks-proofig extension can be enabled/disabled via configuration
- [ ] All ProofFig code is moved to extension package
- [ ] Checks screen dynamically loads check sections from extensions
- [ ] Upload screen dynamically generates check options from extensions
- [ ] No hard-coded ProofFig references in main app code
- [ ] Extension follows same patterns as other extension capabilities
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Documentation updated

