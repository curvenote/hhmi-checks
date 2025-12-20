import { redirect } from 'react-router';
import { error405 } from '@curvenote/scms-core';

export async function loader() {
  throw redirect('/app/sites/pmc/inbox');
}

export async function action() {
  throw error405();
}
