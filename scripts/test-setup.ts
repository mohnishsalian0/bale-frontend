import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function createTestPartners() {
	console.log('🌱 Creating test data...\n');

	// Get or create company
	let companyId: string;
	let warehouseId: string;

	const { data: companies, error: companyError } = await supabase
		.from('companies')
		.select('id')
		.limit(1);

	if (companyError) {
		console.error('❌ Error fetching companies:', companyError);
		return;
	}

	if (!companies || companies.length === 0) {
		console.log('📦 Creating test company...');
		const { data: newCompany, error: createError } = await supabase
			.from('companies')
			.insert({
				name: 'Bale Test Company',
				gst_number: '27AABCT1234A1Z5',
				pan_number: 'AABCT1234A',
				business_type: 'Textile Manufacturing',
				address_line1: '123 Test Street',
				city: 'Mumbai',
				state: 'Maharashtra',
				country: 'India',
				pin_code: '400001',
			})
			.select()
			.single();

		if (createError || !newCompany) {
			console.error('❌ Failed to create company:', createError);
			return;
		}

		companyId = newCompany.id;
		console.log(`✅ Created company: ${companyId}\n`);

		// Create a test warehouse
		console.log('🏭 Creating test warehouse...');
		const { data: warehouse, error: warehouseError } = await supabase
			.from('warehouses')
			.insert({
				company_id: companyId,
				name: 'Main Warehouse',
				address_line1: '123 Test Street',
				city: 'Mumbai',
				state: 'Maharashtra',
				country: 'India',
				pin_code: '400001',
			})
			.select()
			.single();

		if (warehouseError || !warehouse) {
			console.error('❌ Failed to create warehouse:', warehouseError);
			return;
		}

		warehouseId = warehouse.id;
		console.log(`✅ Created warehouse: ${warehouseId}\n`);

		// Create a test admin user
		console.log('👤 Creating test admin user...');
		const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
			email: 'admin@baletest.com',
			password: 'testpassword123',
			email_confirm: true,
		});

		if (authError || !authUser.user) {
			console.error('❌ Failed to create auth user:', authError);
		} else {
			const { data: user, error: userError } = await supabase
				.from('users')
				.insert({
					auth_user_id: authUser.user.id,
					company_id: companyId,
					warehouse_id: warehouse.id,
					first_name: 'Admin',
					last_name: 'User',
					email: 'admin@baletest.com',
					role: 'admin',
				})
				.select()
				.single();

			if (userError) {
				console.error('❌ Failed to create user profile:', userError);
			} else {
				console.log(`✅ Created admin user: ${user.id}\n`);
			}
		}
	} else {
		companyId = companies[0].id;
		console.log(`📦 Using existing company: ${companyId}\n`);

		// Get existing warehouse
		const { data: warehouses, error: whError } = await supabase
			.from('warehouses')
			.select('id')
			.eq('company_id', companyId)
			.limit(1);

		if (whError || !warehouses || warehouses.length === 0) {
			console.error('❌ No warehouse found for company');
			return;
		}

		warehouseId = warehouses[0].id;
	}

	// Get a user to use as created_by
	const { data: users, error: userError } = await supabase
		.from('users')
		.select('id')
		.eq('company_id', companyId)
		.limit(1);

	if (userError || !users || users.length === 0) {
		console.error('❌ No users found for this company. Cannot create partners.');
		return;
	}

	const createdBy = users[0].id;
	console.log(`👤 Using user ${createdBy} as creator\n`);

	const testPartners = [
		// Customers
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'customer',
			first_name: 'Rajesh',
			last_name: 'Kumar',
			company_name: 'Kumar Textiles',
			phone_number: '+91 98765 43210',
			email: 'rajesh@kumartextiles.com',
			address_line1: '123 MG Road',
			city: 'Mumbai',
			state: 'Maharashtra',
			pin_code: '400001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'customer',
			first_name: 'Priya',
			last_name: 'Sharma',
			company_name: 'Sharma Fabrics',
			phone_number: '+91 98765 43211',
			email: 'priya@sharmafabrics.com',
			address_line1: '456 Commercial Street',
			city: 'Bangalore',
			state: 'Karnataka',
			pin_code: '560001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'customer',
			first_name: 'Amit',
			last_name: 'Patel',
			phone_number: '+91 98765 43212',
			address_line1: '789 Ashram Road',
			city: 'Ahmedabad',
			state: 'Gujarat',
			pin_code: '380009',
		},
		// Suppliers
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'supplier',
			first_name: 'Suresh',
			last_name: 'Reddy',
			company_name: 'Reddy Cotton Mills',
			phone_number: '+91 98765 43213',
			email: 'suresh@reddycotton.com',
			address_line1: '321 Industrial Area',
			city: 'Coimbatore',
			state: 'Tamil Nadu',
			pin_code: '641001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'supplier',
			first_name: 'Lakshmi',
			last_name: 'Naidu',
			company_name: 'Naidu Silk House',
			phone_number: '+91 98765 43214',
			address_line1: '654 Silk Market',
			city: 'Kanchipuram',
			state: 'Tamil Nadu',
			pin_code: '631502',
		},
		// Vendors
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'vendor',
			first_name: 'Arjun',
			last_name: 'singh',
			company_name: 'Singh Processing Unit',
			phone_number: '+91 98765 43215',
			email: 'arjun@singhprocessing.com',
			address_line1: '987 Factory Lane',
			city: 'Ludhiana',
			state: 'Punjab',
			pin_code: '141001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'vendor',
			first_name: 'Meera',
			last_name: 'Desai',
			company_name: 'Desai Dyeing Works',
			phone_number: '+91 98765 43216',
			address_line1: '147 Textile Park',
			city: 'Surat',
			state: 'Gujarat',
			pin_code: '395003',
		},
		// Agents
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'agent',
			first_name: 'Vikram',
			last_name: 'Mehta',
			phone_number: '+91 98765 43217',
			email: 'vikram.mehta@example.com',
			address_line1: '258 Transport Nagar',
			city: 'Delhi',
			state: 'Delhi',
			pin_code: '110001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'agent',
			first_name: 'Anjali',
			last_name: 'Gupta',
			phone_number: '+91 98765 43218',
			address_line1: '369 Market Road',
			city: 'Pune',
			state: 'Maharashtra',
			pin_code: '411001',
		},
	];

	for (const partner of testPartners) {
		const { data, error } = await supabase
			.from('partners')
			.insert(partner)
			.select()
			.single();

		if (error) {
			console.error(`❌ Failed to create partner: ${partner.first_name} ${partner.last_name}`);
			console.error(`   Error: ${error.message}`);
		} else {
			console.log(
				`✅ Created ${partner.partner_type}: ${partner.first_name} ${partner.last_name} ${partner.company_name ? `(${partner.company_name})` : ''
				}`
			);
		}
	}

	console.log('\n✨ Test partners created successfully!');

	// Create test products
	console.log('\n📦 Creating test products...\n');

	const testProducts = [
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Premium Silk Saree',
			product_number: 'PROD-001',
			material: 'Silk',
			color: 'Red',
			gsm: 120,
			thread_count_cm: 80,
			tags: ['premium', 'wedding', 'traditional'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 2500.00,
			selling_price_per_unit: 3500.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 10,
			hsn_code: '5007',
			notes: 'Premium quality silk saree with golden border',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Cotton Kurta Fabric',
			product_number: 'PROD-002',
			material: 'Cotton',
			color: 'White',
			gsm: 150,
			thread_count_cm: 60,
			tags: ['summer', 'breathable', 'casual'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 450.00,
			selling_price_per_unit: 650.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 50,
			hsn_code: '5208',
			notes: 'Pure cotton fabric ideal for summer kurtas',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Woolen Shawl Material',
			product_number: 'PROD-003',
			material: 'Wool',
			color: 'Black',
			gsm: 200,
			thread_count_cm: 50,
			tags: ['winter', 'warm', 'premium'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 1800.00,
			selling_price_per_unit: 2500.00,
			show_on_catalog: true,
			min_stock_alert: false,
			hsn_code: '5111',
			notes: 'High-quality woolen fabric for shawls',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Polyester Blend Dress Material',
			product_number: 'PROD-004',
			material: 'Polyester',
			color: 'Blue',
			gsm: 180,
			thread_count_cm: 70,
			tags: ['modern', 'formal', 'wrinkle-free'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 350.00,
			selling_price_per_unit: 550.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 30,
			hsn_code: '5407',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Linen Summer Fabric',
			product_number: 'PROD-005',
			material: 'Linen',
			color: 'White',
			gsm: 140,
			thread_count_cm: 55,
			tags: ['summer', 'eco-friendly', 'breathable'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 800.00,
			selling_price_per_unit: 1200.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 20,
			hsn_code: '5309',
			notes: 'Eco-friendly linen fabric for summer wear',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Designer Silk Fabric',
			product_number: 'PROD-006',
			material: 'Silk',
			color: 'Green',
			gsm: 110,
			thread_count_cm: 75,
			tags: ['designer', 'luxury', 'festive'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 3000.00,
			selling_price_per_unit: 4200.00,
			show_on_catalog: false,
			min_stock_alert: false,
			hsn_code: '5007',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Cotton Denim',
			product_number: 'PROD-007',
			material: 'Denim',
			color: 'Blue',
			gsm: 300,
			thread_count_cm: 40,
			tags: ['denim', 'casual', 'durable'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 600.00,
			selling_price_per_unit: 900.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 40,
			hsn_code: '5209',
			notes: 'Heavy-duty cotton denim fabric',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Yellow Cotton Print',
			product_number: 'PROD-008',
			material: 'Cotton',
			color: 'Yellow',
			gsm: 130,
			thread_count_cm: 65,
			tags: ['printed', 'colorful', 'casual'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 400.00,
			selling_price_per_unit: 600.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 25,
			hsn_code: '5208',
		},
	];

	for (const product of testProducts) {
		const { data, error } = await supabase
			.from('products')
			.insert(product)
			.select()
			.single();

		if (error) {
			console.error(`❌ Failed to create product: ${product.name}`);
			console.error(`   Error: ${error.message}`);
		} else {
			console.log(`✅ Created product: ${product.name} (${product.product_number})`);
		}
	}

	console.log('\n✨ Test products created successfully!');

	// Note: Goods receipts and dispatches creation removed
	// In the new design, users create stock units directly during goods receipt
	// with complete details (size, quality, location, etc.)
	console.log('\n⏭️  Skipping goods receipts/dispatches (users create stock units directly)\n');

	// Get partner IDs for use in receipts and dispatches
	const { data: supplierPartners, error: supplierError } = await supabase
		.from('partners')
		.select('id')
		.eq('company_id', companyId)
		.eq('partner_type', 'supplier')
		.limit(2);

	const { data: customerPartners, error: customerError } = await supabase
		.from('partners')
		.select('id')
		.eq('company_id', companyId)
		.eq('partner_type', 'customer')
		.limit(2);

	if (supplierError || !supplierPartners || supplierPartners.length === 0) {
		console.error('❌ No suppliers found for creating receipts');
	} else if (customerError || !customerPartners || customerPartners.length === 0) {
		console.error('❌ No customers found for creating dispatches');
	} else {
		const supplierId1 = supplierPartners[0].id;
		const supplierId2 = supplierPartners.length > 1 ? supplierPartners[1].id : supplierId1;
		const customerId1 = customerPartners[0].id;
		const customerId2 = customerPartners.length > 1 ? customerPartners[1].id : customerId1;

		// Get product IDs
		const { data: productsList, error: productsError } = await supabase
			.from('products')
			.select('id')
			.eq('company_id', companyId)
			.limit(5);

		if (productsError || !productsList || productsList.length === 0) {
			console.error('❌ No products found for creating receipts/dispatches');
		} else {
			// Create dates spanning 3 months
			const now = new Date();
			const month1 = new Date(now.getFullYear(), now.getMonth(), 15); // Current month, 15th
			const month2 = new Date(now.getFullYear(), now.getMonth() - 1, 20); // Last month, 20th
			const month3 = new Date(now.getFullYear(), now.getMonth() - 2, 10); // 2 months ago, 10th

			// Create 5 goods receipts
			const testReceipts = [
				{
					company_id: companyId,
					warehouse_id: warehouseId,
					created_by: createdBy,
					receipt_number: 'GR-001',
					receipt_type: 'purchase',
					partner_id: supplierId1,
					receipt_date: month3.toISOString().split('T')[0],
					invoice_number: 'INV-2024-001',
					invoice_amount: 15000.00,
					notes: 'Received silk fabrics from supplier',
				},
				{
					company_id: companyId,
					warehouse_id: warehouseId,
					created_by: createdBy,
					receipt_number: 'GR-002',
					receipt_type: 'purchase',
					partner_id: supplierId2,
					receipt_date: month3.toISOString().split('T')[0],
					invoice_number: 'INV-2024-002',
					invoice_amount: 8500.00,
					notes: 'Cotton fabric purchase',
				},
				{
					company_id: companyId,
					warehouse_id: warehouseId,
					created_by: createdBy,
					receipt_number: 'GR-003',
					receipt_type: 'purchase',
					partner_id: supplierId1,
					receipt_date: month2.toISOString().split('T')[0],
					invoice_number: 'INV-2024-003',
					invoice_amount: 22000.00,
					notes: 'Premium woolen fabrics received',
				},
				{
					company_id: companyId,
					warehouse_id: warehouseId,
					created_by: createdBy,
					receipt_number: 'GR-004',
					receipt_type: 'purchase',
					partner_id: supplierId2,
					receipt_date: month2.toISOString().split('T')[0],
					invoice_number: 'INV-2024-004',
					invoice_amount: 12000.00,
					notes: 'Polyester blend materials',
				},
				{
					company_id: companyId,
					warehouse_id: warehouseId,
					created_by: createdBy,
					receipt_number: 'GR-005',
					receipt_type: 'purchase',
					partner_id: supplierId1,
					receipt_date: month1.toISOString().split('T')[0],
					invoice_number: 'INV-2024-005',
					invoice_amount: 18500.00,
					notes: 'Linen fabric stock replenishment',
				},
			];

			const receiptIds: string[] = [];

			for (const receipt of testReceipts) {
				// Check if receipt already exists
				const { data: existingReceipt } = await supabase
					.from('goods_receipts')
					.select('id, receipt_number')
					.eq('company_id', companyId)
					.eq('receipt_number', receipt.receipt_number)
					.single();

				let receiptId: string;

				if (existingReceipt) {
					console.log(`⏭️  Receipt ${receipt.receipt_number} already exists`);
					receiptId = existingReceipt.id;
					receiptIds.push(receiptId);
				} else {
					const { data, error } = await supabase
						.from('goods_receipts')
						.insert(receipt)
						.select()
						.single();

					if (error) {
						console.error(`❌ Failed to create receipt: ${receipt.receipt_number}`);
						console.error(`   Error: ${error.message}`);
						continue;
					} else {
						receiptId = data.id;
						receiptIds.push(receiptId);
						console.log(`✅ Created goods receipt: ${receipt.receipt_number}`);
					}
				}

				// Check if stock units already exist for this receipt
				const { data: existingStockUnits, error: checkStockError } = await supabase
					.from('stock_units')
					.select('id')
					.eq('created_from_receipt_id', receiptId);

				if (checkStockError) {
					console.error(`   ❌ Failed to check existing stock units: ${checkStockError.message}`);
					continue;
				}

				if (existingStockUnits && existingStockUnits.length > 0) {
					console.log(`   ⏭️  Stock units already exist (${existingStockUnits.length} units)`);
					continue;
				}

				// Create stock units directly (2-3 products per receipt)
				const itemCount = Math.floor(Math.random() * 2) + 2; // 2-3 items
				for (let i = 0; i < itemCount && i < productsList.length; i++) {
					const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 units per product

					// Create stock units for each quantity
					for (let j = 0; j < quantity; j++) {
						const { error: stockError } = await supabase
							.from('stock_units')
							.insert({
								company_id: companyId,
								warehouse_id: warehouseId,
								product_id: productsList[i].id,
								created_from_receipt_id: receiptId,
								created_by: createdBy,
								size_quantity: (Math.random() * 50 + 10).toFixed(2), // Random size 10-60
								quality_grade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
								location_description: `Rack ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}-${Math.floor(Math.random() * 10) + 1}`,
								status: 'in_stock',
								manufacturing_date: receipt.receipt_date,
								barcode_generated: false,
							});

						if (stockError) {
							console.error(`   ❌ Failed to create stock unit: ${stockError.message}`);
						} else {
							console.log(`   ✅ Created stock unit ${j + 1}/${quantity} for product ${i + 1}`);
						}
					}
				}
			}

			// Get stock units that were auto-created from receipts
			const { data: stockUnits, error: stockError } = await supabase
				.from('stock_units')
				.select('id')
				.eq('company_id', companyId)
				.eq('status', 'in_stock')
				.limit(15);

			if (stockError || !stockUnits || stockUnits.length === 0) {
				console.error('❌ No stock units available for creating dispatches');
			} else {
				// Create 5 goods dispatches
				const testDispatches = [
					{
						company_id: companyId,
						warehouse_id: warehouseId,
						created_by: createdBy,
						dispatch_number: 'GD-001',
						dispatch_type: 'other',
						other_reason: 'Sample dispatch for exhibition',
						dispatch_date: month3.toISOString().split('T')[0],
						invoice_number: 'DISP-001',
						invoice_amount: 5000.00,
						notes: 'Sample fabrics sent for trade show',
					},
					{
						company_id: companyId,
						warehouse_id: warehouseId,
						created_by: createdBy,
						dispatch_number: 'GD-002',
						dispatch_type: 'other',
						other_reason: 'Quality testing at external lab',
						dispatch_date: month3.toISOString().split('T')[0],
						invoice_number: 'DISP-002',
						notes: 'Silk samples for quality verification',
					},
					{
						company_id: companyId,
						warehouse_id: warehouseId,
						created_by: createdBy,
						dispatch_number: 'GD-003',
						dispatch_type: 'other',
						other_reason: 'Customer sample approval',
						dispatch_date: month2.toISOString().split('T')[0],
						invoice_number: 'DISP-003',
						invoice_amount: 3500.00,
						notes: 'Cotton fabric samples for customer review',
					},
					{
						company_id: companyId,
						warehouse_id: warehouseId,
						created_by: createdBy,
						dispatch_number: 'GD-004',
						dispatch_type: 'other',
						other_reason: 'Marketing material dispatch',
						dispatch_date: month2.toISOString().split('T')[0],
						invoice_number: 'DISP-004',
						notes: 'Product samples for marketing campaign',
					},
					{
						company_id: companyId,
						warehouse_id: warehouseId,
						created_by: createdBy,
						dispatch_number: 'GD-005',
						dispatch_type: 'other',
						other_reason: 'Demo pieces for new collection',
						dispatch_date: month1.toISOString().split('T')[0],
						invoice_number: 'DISP-005',
						invoice_amount: 7500.00,
						notes: 'New season collection samples',
					},
				];

				let stockUnitIndex = 0;

				for (const dispatch of testDispatches) {
					// Check if dispatch already exists
					const { data: existingDispatch } = await supabase
						.from('goods_dispatches')
						.select('id, dispatch_number')
						.eq('company_id', companyId)
						.eq('dispatch_number', dispatch.dispatch_number)
						.single();

					let dispatchId: string;

					if (existingDispatch) {
						console.log(`⏭️  Dispatch ${dispatch.dispatch_number} already exists`);
						dispatchId = existingDispatch.id;
					} else {
						const { data, error } = await supabase
							.from('goods_dispatches')
							.insert(dispatch)
							.select()
							.single();

						if (error) {
							console.error(`❌ Failed to create dispatch: ${dispatch.dispatch_number}`);
							console.error(`   Error: ${error.message}`);
							continue;
						} else {
							dispatchId = data.id;
							console.log(`✅ Created goods dispatch: ${dispatch.dispatch_number}`);
						}
					}

					// Check if dispatch items already exist
					const { data: existingItems, error: checkItemsError } = await supabase
						.from('goods_dispatch_items')
						.select('id')
						.eq('dispatch_id', dispatchId);

					if (checkItemsError) {
						console.error(`   ❌ Failed to check existing items: ${checkItemsError.message}`);
						continue;
					}

					if (existingItems && existingItems.length > 0) {
						console.log(`   ⏭️  Dispatch items already exist (${existingItems.length} items)`);
						continue;
					}

					// Add dispatch items (1-3 stock units per dispatch)
					const itemCount = Math.min(3, stockUnits.length - stockUnitIndex);
					for (let i = 0; i < itemCount && stockUnitIndex < stockUnits.length; i++) {
						const { error: itemError } = await supabase
							.from('goods_dispatch_items')
							.insert({
								company_id: companyId,
								dispatch_id: dispatchId,
								stock_unit_id: stockUnits[stockUnitIndex].id,
							});

						if (itemError) {
							console.error(`   ❌ Failed to add item to dispatch: ${itemError.message}`);
						} else {
							// Update stock unit status to dispatched
							await supabase
								.from('stock_units')
								.update({ status: 'dispatched' })
								.eq('id', stockUnits[stockUnitIndex].id);
							console.log(`   ✅ Added dispatch item with stock unit ${stockUnitIndex + 1}`);
						}

						stockUnitIndex++;
					}
				}
			}

			console.log('\n✨ Test goods receipts and dispatches created successfully!');
		}
	}

	// 5. Create invite for the test company
	console.log('\n🎟️  Creating admin invite for test company...');
	const adminToken = randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

	const { data: adminInvite, error: adminInviteError } = await supabase
		.from('invites')
		.insert({
			token: adminToken,
			company_id: companyId,
			warehouse_id: warehouseId,
			role: 'admin',
			expires_at: expiresAt.toISOString(),
		})
		.select()
		.single();

	if (adminInviteError) {
		console.error('❌ Error creating admin invite:', adminInviteError);
	} else {
		console.log(`✅ Admin invite created\n`);
	}

	// 6. Create staff invite
	console.log('🎟️  Creating staff invite for test company...');
	const staffToken = randomBytes(32).toString('hex');

	const { data: staffInvite, error: staffInviteError } = await supabase
		.from('invites')
		.insert({
			token: staffToken,
			company_id: companyId,
			warehouse_id: warehouseId,
			role: 'staff',
			expires_at: expiresAt.toISOString(),
		})
		.select()
		.single();

	if (staffInviteError) {
		console.error('❌ Error creating staff invite:', staffInviteError);
	} else {
		console.log(`✅ Staff invite created\n`);
	}

	// Print invite links
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('🎉 Setup Complete!\n');
	console.log('📋 Test Company Details:');
	console.log(`   Company ID: ${companyId}`);
	console.log(`   Warehouse ID: ${warehouseId}\n`);
	console.log('🔗 Invite Links (valid for 7 days):\n');
	console.log('👤 Admin Invite:');
	console.log(`   http://localhost:3000/invite/${adminToken}\n`);
	console.log('👷 Staff Invite:');
	console.log(`   http://localhost:3000/invite/${staffToken}\n`);
	console.log('💡 Use these invite links to create users for the test company with partners data');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

createTestPartners().catch(console.error);
