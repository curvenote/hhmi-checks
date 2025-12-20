import type { MenuContents, NavigationRegistration } from '@curvenote/scms-core';

export function registerNavigation(): NavigationRegistration[] {
  return [
    {
      attachTo: 'app',
      replace: false,
      register: (baseUrl: string) =>
        [
          {
            sectionName: 'Compliance Dashboard',
            menus: [
              {
                name: 'hhmi-compliance',
                label: 'Compliance Dashboard',
                url: `${baseUrl}/compliance`,
              },
            ],
          },
        ] satisfies MenuContents,
    },
  ];
}
