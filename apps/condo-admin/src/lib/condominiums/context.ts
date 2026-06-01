import type { AuthProfile } from "@kynovia/auth";
import { getCurrentProfile } from "../auth/session";
import { createServerSupabaseClient } from "../supabase/server";

export type ActiveCondominium = {
  city: string;
  cnpj: string;
  complement: string;
  email: string;
  fullAddress: string;
  id: string;
  name: string;
  number: string;
  phone: string;
  postalCode: string;
  slug: string;
  state: string;
  timezone: string;
  unitRegistrationMode: "horizontal" | "vertical" | null;
  visitorParkingCapacity: number;
  whatsapp: string;
};

export type CondoAdminContext = {
  condominium: ActiveCondominium | null;
  profile: AuthProfile;
};

type CondominiumRow = {
  id: string;
  metadata: unknown;
  name: string;
  slug: string;
  timezone: string;
  unit_registration_mode: string | null;
  visitor_parking_capacity: number;
};

const condoAdminMembershipRoles = [
  "condominium_admin",
  "syndic",
  "manager",
  "doorman_supervisor",
  "resident_manager"
];

function mapCondominium(row: CondominiumRow): ActiveCondominium {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const client =
    metadata.client && typeof metadata.client === "object" && !Array.isArray(metadata.client)
      ? (metadata.client as Record<string, unknown>)
      : {};
  const address =
    client.address && typeof client.address === "object" && !Array.isArray(client.address)
      ? (client.address as Record<string, unknown>)
      : {};
  const value = (key: string) => {
    const item = metadata[key];
    return typeof item === "string" ? item : "";
  };
  const clientValue = (key: string) => {
    const item = client[key];
    return typeof item === "string" ? item : "";
  };
  const addressValue = (key: string) => {
    const item = address[key];
    return typeof item === "string" ? item : "";
  };
  const metadataUnitRegistrationMode = value("unitRegistrationMode");
  const unitRegistrationMode = row.unit_registration_mode ?? metadataUnitRegistrationMode;

  return {
    city: value("city") || addressValue("city"),
    cnpj: value("cnpj") || clientValue("cnpj"),
    complement: value("complement") || addressValue("complement"),
    email: value("email") || clientValue("email"),
    fullAddress: value("fullAddress") || addressValue("line"),
    id: row.id,
    name: row.name,
    number: value("number") || addressValue("number"),
    phone: value("phone") || clientValue("phone"),
    postalCode: value("postalCode") || addressValue("postal_code"),
    slug: row.slug,
    state: value("state") || addressValue("state"),
    timezone: row.timezone,
    unitRegistrationMode:
      unitRegistrationMode === "horizontal" || unitRegistrationMode === "vertical"
        ? unitRegistrationMode
        : null,
    visitorParkingCapacity: row.visitor_parking_capacity,
    whatsapp: value("whatsapp")
  };
}

export async function getCondoAdminContext(): Promise<CondoAdminContext | null> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  let condominiumId: string | null = null;

  if (condoAdminMembershipRoles.includes(profile.role)) {
    const { data: membership } = await supabase
      .from("condominium_memberships")
      .select("condominium_id")
      .eq("profile_id", profile.id)
      .eq("tenant_id", profile.tenantId)
      .in("role", condoAdminMembershipRoles)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    condominiumId = membership?.condominium_id ?? null;
  }

  let query = supabase
    .from("condominiums")
    .select("id, name, slug, timezone, unit_registration_mode, visitor_parking_capacity, metadata")
    .eq("tenant_id", profile.tenantId)
    .order("name", { ascending: true })
    .limit(1);

  if (condominiumId) {
    query = query.eq("id", condominiumId);
  }

  const { data: condominium } = await query.maybeSingle();

  return {
    condominium: condominium ? mapCondominium(condominium) : null,
    profile
  };
}
