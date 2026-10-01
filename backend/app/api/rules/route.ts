import { NextRequest } from 'next/server';
import { TEST_MODULES, DEFAULT_TEST_PLAN } from '@/lib/rules-engine/oiml-r76';
import { extractToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = extractToken(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const modules = Object.values(TEST_MODULES).map(m => ({
    id: m.id,
    name: m.name,
    standardReference: m.standardReference,
    description: m.description,
    requiredFor: m.requiredFor,
    requiredEquipment: m.requiredEquipment,
    observationFields: m.observationFields,
  }));

  return Response.json({
    version: 'OIML_R76_2006',
    modules,
    defaultTestPlan: DEFAULT_TEST_PLAN,
  });
}
