const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ─── Admin ────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('belaflor1', 10)
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@pulse.com' },
    update: {},
    create: {
      email: 'admin@pulse.com',
      passwordHash: adminHash,
      name: 'Admin PULSE',
      role: 'SUPER_ADMIN',
    },
  })
  console.log('✅ Admin criado:', admin.email)

  // ─── Região Brasil ────────────────────────────────────────────────────────
  const region = await prisma.region.upsert({
    where: { id: 'reg-brasil' },
    update: {},
    create: {
      id: 'reg-brasil',
      name: 'Brasil',
      currencyCode: 'BRL',
      countries: ['br'],
      taxRate: 0,
    },
  })
  console.log('✅ Região criada:', region.name)

  // ─── Opções de Frete ──────────────────────────────────────────────────────
  const shippingOptions = await Promise.all([
    prisma.shippingOption.upsert({
      where: { id: 'ship-pac' },
      update: {},
      create: {
        id: 'ship-pac',
        name: 'PAC',
        regionId: region.id,
        price: 15.9,
        provider: 'correios',
        estimatedDays: 10,
      },
    }),
    prisma.shippingOption.upsert({
      where: { id: 'ship-sedex' },
      update: {},
      create: {
        id: 'ship-sedex',
        name: 'SEDEX',
        regionId: region.id,
        price: 29.9,
        provider: 'correios',
        estimatedDays: 3,
      },
    }),
    prisma.shippingOption.upsert({
      where: { id: 'ship-free' },
      update: {},
      create: {
        id: 'ship-free',
        name: 'Frete Grátis',
        regionId: region.id,
        price: 0,
        provider: 'pulse',
        estimatedDays: 15,
      },
    }),
  ])
  console.log('✅ Opções de frete criadas:', shippingOptions.length)

  // ─── Categorias ───────────────────────────────────────────────────────────
  const catCamisetas = await prisma.category.upsert({
    where: { handle: 'camisetas' },
    update: {},
    create: { name: 'Camisetas', handle: 'camisetas', description: 'Camisetas e tops' },
  })
  const catCalcas = await prisma.category.upsert({
    where: { handle: 'calcas' },
    update: {},
    create: { name: 'Calças', handle: 'calcas', description: 'Calças e shorts' },
  })
  const catAcessorios = await prisma.category.upsert({
    where: { handle: 'acessorios' },
    update: {},
    create: { name: 'Acessórios', handle: 'acessorios', description: 'Bonés, bolsas e mais' },
  })
  console.log('✅ Categorias criadas: 3')

  // ─── Coleções ─────────────────────────────────────────────────────────────
  const colVerao = await prisma.collection.upsert({
    where: { handle: 'verao-2025' },
    update: {},
    create: { name: 'Verão 2025', handle: 'verao-2025', description: 'Coleção verão 2025' },
  })
  const colEssentials = await prisma.collection.upsert({
    where: { handle: 'essentials' },
    update: {},
    create: { name: 'Essentials', handle: 'essentials', description: 'Peças essenciais do dia a dia' },
  })
  console.log('✅ Coleções criadas: 2')

  // ─── Produtos ─────────────────────────────────────────────────────────────
  const produtos = [
    {
      id: 'prod-camiseta-preta',
      title: 'Camiseta Oversized Preta',
      handle: 'camiseta-oversized-preta',
      description: 'Camiseta oversized em algodão premium 100%. Corte relaxado e confortável para o dia a dia.',
      status: 'PUBLISHED',
      thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
      categoryId: catCamisetas.id,
      collectionId: colEssentials.id,
      tags: ['camiseta', 'oversized', 'preto', 'algodão'],
      images: [
        { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', alt: 'Camiseta Oversized Preta - frente', position: 0 },
        { url: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80', alt: 'Camiseta Oversized Preta - detalhe', position: 1 },
      ],
      variants: [
        { title: 'P', sku: 'CAM-OVR-PRT-P', price: 89.9, inventory: 15 },
        { title: 'M', sku: 'CAM-OVR-PRT-M', price: 89.9, inventory: 20 },
        { title: 'G', sku: 'CAM-OVR-PRT-G', price: 89.9, inventory: 18 },
        { title: 'GG', sku: 'CAM-OVR-PRT-GG', price: 89.9, inventory: 10 },
      ],
    },
    {
      id: 'prod-camiseta-branca',
      title: 'Camiseta Básica Branca',
      handle: 'camiseta-basica-branca',
      description: 'Camiseta básica em algodão penteado. Essencial para qualquer look.',
      status: 'PUBLISHED',
      thumbnail: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400',
      categoryId: catCamisetas.id,
      collectionId: colEssentials.id,
      tags: ['camiseta', 'básica', 'branco', 'algodão'],
      images: [
        { url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80', alt: 'Camiseta Básica Branca - frente', position: 0 },
        { url: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80', alt: 'Camiseta Básica Branca - detalhe', position: 1 },
      ],
      variants: [
        { title: 'P', sku: 'CAM-BAS-BRC-P', price: 69.9, inventory: 25 },
        { title: 'M', sku: 'CAM-BAS-BRC-M', price: 69.9, inventory: 30 },
        { title: 'G', sku: 'CAM-BAS-BRC-G', price: 69.9, inventory: 22 },
        { title: 'GG', sku: 'CAM-BAS-BRC-GG', price: 69.9, inventory: 12 },
      ],
    },
    {
      id: 'prod-calca-cargo',
      title: 'Calça Cargo Preta',
      handle: 'calca-cargo-preta',
      description: 'Calça cargo com múltiplos bolsos. Tecido resistente e confortável.',
      status: 'PUBLISHED',
      thumbnail: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400',
      categoryId: catCalcas.id,
      collectionId: colVerao.id,
      tags: ['calça', 'cargo', 'preto', 'bolsos'],
      images: [
        { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80', alt: 'Calça Cargo Preta - frente', position: 0 },
        { url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80', alt: 'Calça Cargo Preta - detalhe', position: 1 },
      ],
      variants: [
        { title: '38', sku: 'CAL-CRG-PRT-38', price: 189.9, inventory: 8 },
        { title: '40', sku: 'CAL-CRG-PRT-40', price: 189.9, inventory: 12 },
        { title: '42', sku: 'CAL-CRG-PRT-42', price: 189.9, inventory: 10 },
        { title: '44', sku: 'CAL-CRG-PRT-44', price: 189.9, inventory: 6 },
      ],
    },
    {
      id: 'prod-shorts-moletom',
      title: 'Shorts Moletom Cinza',
      handle: 'shorts-moletom-cinza',
      description: 'Shorts em moletom leve. Perfeito para o verão e atividades casuais.',
      status: 'PUBLISHED',
      thumbnail: 'https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=400',
      categoryId: catCalcas.id,
      collectionId: colVerao.id,
      tags: ['shorts', 'moletom', 'cinza', 'verão'],
      images: [
        { url: 'https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=800&q=80', alt: 'Shorts Moletom Cinza - frente', position: 0 },
        { url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80', alt: 'Shorts Moletom Cinza - detalhe', position: 1 },
      ],
      variants: [
        { title: 'P', sku: 'SHO-MOL-CIN-P', price: 99.9, inventory: 20 },
        { title: 'M', sku: 'SHO-MOL-CIN-M', price: 99.9, inventory: 25 },
        { title: 'G', sku: 'SHO-MOL-CIN-G', price: 99.9, inventory: 18 },
      ],
    },
    {
      id: 'prod-bone-pulse',
      title: 'Boné PULSE Aba Reta',
      handle: 'bone-pulse-aba-reta',
      description: 'Boné com logo PULSE bordado. Aba reta ajustável.',
      status: 'PUBLISHED',
      thumbnail: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400',
      categoryId: catAcessorios.id,
      collectionId: colEssentials.id,
      tags: ['boné', 'acessório', 'logo', 'preto'],
      images: [
        { url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80', alt: 'Boné PULSE Aba Reta - frente', position: 0 },
        { url: 'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=800&q=80', alt: 'Boné PULSE Aba Reta - lateral', position: 1 },
      ],
      variants: [
        { title: 'Único', sku: 'BON-PLS-PRT-U', price: 79.9, inventory: 30 },
      ],
    },
    {
      id: 'prod-mochila-pulse',
      title: 'Mochila PULSE 20L',
      handle: 'mochila-pulse-20l',
      description: 'Mochila resistente com 20 litros de capacidade. Compartimento para notebook.',
      status: 'PUBLISHED',
      thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
      categoryId: catAcessorios.id,
      collectionId: colVerao.id,
      tags: ['mochila', 'acessório', 'notebook', 'viagem'],
      images: [
        { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', alt: 'Mochila PULSE 20L - frente', position: 0 },
        { url: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&q=80', alt: 'Mochila PULSE 20L - detalhe', position: 1 },
      ],
      variants: [
        { title: 'Preta', sku: 'MOC-PLS-PRT-U', price: 249.9, inventory: 15 },
        { title: 'Cinza', sku: 'MOC-PLS-CIN-U', price: 249.9, inventory: 10 },
      ],
    },
    {
      id: 'prod-camiseta-grafite',
      title: 'Camiseta Grafite Logo',
      handle: 'camiseta-grafite-logo',
      description: 'Camiseta com estampa gráfica exclusiva PULSE. Algodão 100%.',
      status: 'PUBLISHED',
      thumbnail: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400',
      categoryId: catCamisetas.id,
      collectionId: colVerao.id,
      tags: ['camiseta', 'estampa', 'grafite', 'logo'],
      images: [
        { url: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&q=80', alt: 'Camiseta Grafite Logo - frente', position: 0 },
        { url: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800&q=80', alt: 'Camiseta Grafite Logo - detalhe', position: 1 },
      ],
      variants: [
        { title: 'P', sku: 'CAM-GRF-LOG-P', price: 109.9, compareAtPrice: 139.9, inventory: 12 },
        { title: 'M', sku: 'CAM-GRF-LOG-M', price: 109.9, compareAtPrice: 139.9, inventory: 15 },
        { title: 'G', sku: 'CAM-GRF-LOG-G', price: 109.9, compareAtPrice: 139.9, inventory: 10 },
      ],
    },
    {
      id: 'prod-calca-jeans',
      title: 'Calça Jeans Slim',
      handle: 'calca-jeans-slim',
      description: 'Calça jeans slim fit. Lavagem escura com acabamento premium.',
      status: 'DRAFT',
      thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
      categoryId: catCalcas.id,
      collectionId: null,
      tags: ['calça', 'jeans', 'slim', 'azul'],
      images: [
        { url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80', alt: 'Calça Jeans Slim - frente', position: 0 },
      ],
      variants: [
        { title: '38', sku: 'CAL-JNS-SLM-38', price: 219.9, inventory: 0 },
        { title: '40', sku: 'CAL-JNS-SLM-40', price: 219.9, inventory: 0 },
      ],
    },
  ]

  for (const p of produtos) {
    const { variants, images, ...productData } = p

    // Upsert the product itself
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        title: productData.title,
        description: productData.description,
        status: productData.status,
        thumbnail: productData.thumbnail,
        tags: productData.tags,
      },
      create: {
        ...productData,
        variants: {
          create: variants.map(v => ({
            title: v.title,
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compareAtPrice || null,
            inventory: v.inventory,
            options: {},
          })),
        },
        images: {
          create: images.map(img => ({
            url: img.url,
            alt: img.alt,
            position: img.position,
          })),
        },
      },
    })

    // Upsert each variant individually so inventory is always up to date
    for (const v of variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          title: v.title,
          price: v.price,
          compareAtPrice: v.compareAtPrice || null,
          inventory: v.inventory,
        },
        create: {
          productId: p.id,
          title: v.title,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compareAtPrice || null,
          inventory: v.inventory,
          options: {},
        },
      })
    }

    // Upsert images: delete existing and recreate to keep positions correct
    const existingImages = await prisma.productImage.findMany({ where: { productId: p.id } })
    if (existingImages.length === 0) {
      await prisma.productImage.createMany({
        data: images.map(img => ({
          productId: p.id,
          url: img.url,
          alt: img.alt,
          position: img.position,
        })),
      })
    }
  }
  console.log('✅ Produtos criados/atualizados:', produtos.length)

  // ─── Cliente de teste ─────────────────────────────────────────────────────
  const customerHash = await bcrypt.hash('senha123', 10)
  const customer = await prisma.customer.upsert({
    where: { email: 'cliente@teste.com' },
    update: {},
    create: {
      email: 'cliente@teste.com',
      passwordHash: customerHash,
      firstName: 'João',
      lastName: 'Silva',
      phone: '11999999999',
      addresses: {
        create: {
          firstName: 'João',
          lastName: 'Silva',
          address1: 'Rua das Flores, 123',
          city: 'São Paulo',
          province: 'SP',
          postalCode: '01310-100',
          countryCode: 'br',
          phone: '11999999999',
          isDefault: true,
        },
      },
    },
  })
  console.log('✅ Cliente de teste criado:', customer.email)

  // ─── Pedidos de exemplo ───────────────────────────────────────────────────
  const variant1 = await prisma.productVariant.findFirst({ where: { sku: 'CAM-OVR-PRT-M' } })
  const variant2 = await prisma.productVariant.findFirst({ where: { sku: 'BON-PLS-PRT-U' } })

  if (variant1 && variant2) {
    const shippingAddr = JSON.stringify({
      firstName: 'João', lastName: 'Silva',
      address1: 'Rua das Flores, 123', city: 'São Paulo',
      province: 'SP', postalCode: '01310-100', countryCode: 'br',
    })

    await prisma.order.upsert({
      where: { id: 'order-seed-001' },
      update: {},
      create: {
        id: 'order-seed-001',
        customerId: customer.id,
        email: customer.email,
        status: 'DELIVERED',
        paymentStatus: 'CAPTURED',
        subtotal: 169.8,
        shippingTotal: 15.9,
        taxTotal: 0,
        discountTotal: 0,
        total: 185.7,
        currencyCode: 'BRL',
        shippingAddressId: shippingAddr,
        billingAddressId: shippingAddr,
        shippingOptionId: shippingOptions[0].id,
        items: {
          create: [
            {
              variantId: variant1.id,
              title: 'Camiseta Oversized Preta',
              variantTitle: 'M',
              thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
              quantity: 1,
              unitPrice: 89.9,
              total: 89.9,
            },
            {
              variantId: variant2.id,
              title: 'Boné PULSE Aba Reta',
              variantTitle: 'Único',
              thumbnail: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400',
              quantity: 1,
              unitPrice: 79.9,
              total: 79.9,
            },
          ],
        },
      },
    })

    await prisma.order.upsert({
      where: { id: 'order-seed-002' },
      update: {},
      create: {
        id: 'order-seed-002',
        customerId: customer.id,
        email: customer.email,
        status: 'PROCESSING',
        paymentStatus: 'CAPTURED',
        subtotal: 89.9,
        shippingTotal: 29.9,
        taxTotal: 0,
        discountTotal: 0,
        total: 119.8,
        currencyCode: 'BRL',
        shippingAddressId: shippingAddr,
        billingAddressId: shippingAddr,
        shippingOptionId: shippingOptions[1].id,
        items: {
          create: [
            {
              variantId: variant1.id,
              title: 'Camiseta Oversized Preta',
              variantTitle: 'M',
              thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
              quantity: 1,
              unitPrice: 89.9,
              total: 89.9,
            },
          ],
        },
      },
    })

    console.log('✅ Pedidos de exemplo criados: 2')
  }

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('─────────────────────────────────────')
  console.log('🔑 Admin:    admin@pulse.com / admin123')
  console.log('👤 Cliente:  cliente@teste.com / senha123')
  console.log('🌐 Painel:   http://localhost:9000/admin-panel')
  console.log('─────────────────────────────────────')
}

main()
  .catch(e => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
