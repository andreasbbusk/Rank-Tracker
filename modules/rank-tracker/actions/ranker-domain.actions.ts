"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  createDomain as createDomainRecord,
  deleteDomain as deleteDomainRecord,
  getDomainById,
  updateDomain as updateDomainRecord,
  listDomains,
} from "../db/services/domain.service";
import { getDomainsView } from "../db/services/view.service";

export async function createDomain({
  url,
  display_name,
}: {
  url: string;
  display_name: string;
}) {
  try {
    const result = await createDomainRecord({ url, display_name });

    revalidateTag("rank-tracker-domains");
    revalidatePath("/");

    return result;
  } catch (error) {
    console.error(error);
    return { error: true, message: "Kunne ikke oprette domænet." };
  }
}

export async function updateDomain({
  id,
  url,
  display_name,
}: {
  id: string;
  url: string;
  display_name: string;
}) {
  try {
    const result = await updateDomainRecord({ id, url, display_name });

    revalidateTag("rank-tracker-domains");
    revalidateTag("domain-keywords-view");
    revalidatePath("/");

    return result;
  } catch (error) {
    console.error(error);
    return { error: true, message: "Kunne ikke opdatere domænet." };
  }
}

export async function getDomain(id: string) {
  try {
    return await getDomainById(id);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function deleteDomain(id: string) {
  try {
    const success = await deleteDomainRecord(id);

    if (!success) {
      return { error: true, message: "Domænet blev ikke fundet." };
    }

    revalidateTag("rank-tracker-domains");
    revalidateTag("domain-keywords-view");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: true, message: "Kunne ikke slette domænet." };
  }
}

export async function getDomainList() {
  try {
    return await listDomains();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function viewDomain() {
  try {
    const records = await getDomainsView();
    return records;
  } catch (error) {
    console.error(error);
    return [];
  }
}
