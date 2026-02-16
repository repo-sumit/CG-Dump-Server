import { prisma } from "@cg-dump/db";
import type { AuthContext } from "./auth";
import { DomainError } from "./errors";
import { FMB_TEMPLATE_V1, TemplateDefinitionSchema, type CreateTemplateInput } from "@cg-dump/shared";

function isAdmin(context: AuthContext) {
  return context.role === "admin";
}

export async function createOrUpdateTemplate(input: CreateTemplateInput) {
  const productCode = input.productCode.trim().toUpperCase();
  const product = await prisma.product.findUnique({
    where: { code: productCode }
  });
  if (!product) {
    throw new DomainError(404, "Product not found", { productCode });
  }

  return prisma.template.upsert({
    where: {
      productId_code: {
        productId: product.id,
        code: input.code.trim().toUpperCase()
      }
    },
    update: {
      name: input.name.trim(),
      schema: input.schema as any,
      isActive: true
    },
    create: {
      productId: product.id,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      schema: input.schema as any,
      isActive: true
    }
  });
}

export async function seedFmbTemplate() {
  const product = await prisma.product.upsert({
    where: { code: "FMB" },
    update: {
      name: "Foundational Literacy and Numeracy",
      isGloballyOn: true
    },
    create: {
      code: "FMB",
      name: "Foundational Literacy and Numeracy",
      isGloballyOn: true
    }
  });

  const parsed = TemplateDefinitionSchema.parse(FMB_TEMPLATE_V1);
  return prisma.template.upsert({
    where: {
      productId_code: {
        productId: product.id,
        code: parsed.code
      }
    },
    update: {
      name: parsed.name,
      schema: parsed as any,
      isActive: true
    },
    create: {
      productId: product.id,
      code: parsed.code,
      name: parsed.name,
      schema: parsed as any,
      isActive: true
    }
  });
}

export async function listTemplates(context: AuthContext, productCode: string) {
  const normalizedCode = productCode.trim().toUpperCase();
  const product = await prisma.product.findUnique({
    where: { code: normalizedCode }
  });
  if (!product) {
    throw new DomainError(404, "Product not found", { productCode: normalizedCode });
  }

  if (!isAdmin(context)) {
    const stateId = context.user.stateId as string;
    const enabled = await prisma.stateProduct.findFirst({
      where: {
        stateId,
        productId: product.id,
        enabled: true,
        product: { isGloballyOn: true }
      }
    });
    if (!enabled) {
      throw new DomainError(403, "Product is not enabled for this state", {
        productCode: normalizedCode
      });
    }
  }

  return prisma.template.findMany({
    where: {
      productId: product.id,
      isActive: true
    },
    orderBy: { code: "asc" }
  });
}
