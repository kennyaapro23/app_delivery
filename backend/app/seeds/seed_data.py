"""
Datos iniciales de demostración para la base de datos.
Coincide con los datos hardcoded del frontend existente.
"""

from sqlalchemy.orm import Session

from app.models.user import User, UserRole, MembershipLevel
from app.models.product import Product, Category
from app.models.delivery import DeliveryProfile, VehicleType
from app.models.address import Address
from app.models.coupon import Coupon
from app.core.security import hash_password


def seed_database(db: Session):
    """Pobla la base de datos con datos de demostración."""

    # Verificar si ya hay datos
    if db.query(User).count() > 0:
        print("⚠️  Base de datos ya tiene datos. Saltando seed.")
        return

    print("🌱 Sembrando datos de demostración...")

    # ─── USUARIOS ─────────────────────────────────────────────────
    admin = User(
        email="admin@chikenhot.pe",
        hashed_password=hash_password("admin123"),
        full_name="Administrador",
        phone="+51 999000111",
        role=UserRole.ADMIN,
    )
    cliente = User(
        email="cliente@chikenhot.pe",
        hashed_password=hash_password("cliente123"),
        full_name="Juan Cliente",
        phone="+51 987654321",
        role=UserRole.CUSTOMER,
        points=450,
        membership_level=MembershipLevel.PLATA,
    )
    driver1 = User(
        email="delivery@chikenhot.pe",
        hashed_password=hash_password("delivery123"),
        full_name="Diego Rodríguez",
        phone="+51 987654321",
        role=UserRole.DELIVERY_DRIVER,
    )
    driver2 = User(
        email="luis@chikenhot.pe",
        hashed_password=hash_password("delivery123"),
        full_name="Luis Martínez",
        phone="+51 987654322",
        role=UserRole.DELIVERY_DRIVER,
    )
    driver3 = User(
        email="juan.p@chikenhot.pe",
        hashed_password=hash_password("delivery123"),
        full_name="Juan Pérez",
        phone="+51 987654323",
        role=UserRole.DELIVERY_DRIVER,
    )
    driver4 = User(
        email="carlos@chikenhot.pe",
        hashed_password=hash_password("delivery123"),
        full_name="Carlos Mendoza",
        phone="+51 987654324",
        role=UserRole.DELIVERY_DRIVER,
    )

    db.add_all([admin, cliente, driver1, driver2, driver3, driver4])
    db.flush()

    # ─── CATEGORÍAS ───────────────────────────────────────────────
    cat_pollos = Category(name="Pollos", icon="🍗", description="Pollos a la brasa y más", display_order=1)
    cat_combos = Category(name="Combos", icon="🍟", description="Combos familiares y personales", display_order=2)
    cat_alitas = Category(name="Alitas", icon="🍖", description="Alitas crujientes", display_order=3)
    cat_bebidas = Category(name="Bebidas", icon="🥤", description="Refrescos y más", display_order=4)
    cat_extras = Category(name="Extras", icon="🥗", description="Acompañamientos y extras", display_order=5)

    db.add_all([cat_pollos, cat_combos, cat_alitas, cat_bebidas, cat_extras])
    db.flush()

    # ─── PRODUCTOS (coinciden con el frontend) ────────────────────
    products = [
        Product(name="Pollo 1/4", description="Con arroz y papas", price=18.50,
                category_id=cat_pollos.id, icon="🍗", is_featured=True),
        Product(name="Pollo Entero", description="Fresco con papas grande", price=45.00,
                category_id=cat_pollos.id, icon="🍗", is_featured=True),
        Product(name="Combo Familiar", description="4 cuartos + papas + delivery", price=89.90,
                category_id=cat_combos.id, icon="🍟", is_featured=True),
        Product(name="Combo Personal", description="1/4 pollo + papas + bebida", price=25.00,
                category_id=cat_combos.id, icon="🍟"),
        Product(name="Balde 12 Pzs", description="Variado con papas y ensalada", price=125.00,
                category_id=cat_pollos.id, icon="🍖", is_featured=True),
        Product(name="Alitas x20", description="Crujientes y sazonadas", price=35.00,
                category_id=cat_alitas.id, icon="🍖", is_featured=True),
        Product(name="Alitas x10", description="Crujientes y sazonadas", price=20.00,
                category_id=cat_alitas.id, icon="🍖"),
        Product(name="Bebida 2L", description="Refresco 2L variados", price=12.00,
                category_id=cat_bebidas.id, icon="🥤"),
        Product(name="Bebida 2.5L", description="Refresco 2.5L variados", price=15.00,
                category_id=cat_bebidas.id, icon="🥤"),
        Product(name="Bebidas", description="Refresco 2L variados", price=8.50,
                category_id=cat_bebidas.id, icon="🥤", is_featured=True),
        Product(name="Papas Grandes", description="Porción grande de papas fritas", price=8.00,
                category_id=cat_extras.id, icon="🍟"),
        Product(name="Papas Medianas", description="Porción mediana de papas fritas", price=6.00,
                category_id=cat_extras.id, icon="🍟"),
        Product(name="Papas Extra", description="Porción extra de papas fritas", price=10.00,
                category_id=cat_extras.id, icon="🍟"),
        Product(name="Salsa Picante", description="Salsa especial de la casa", price=2.50,
                category_id=cat_extras.id, icon="🌶️"),
        Product(name="Arroz con Pollo", description="Porción de arroz con pollo", price=15.00,
                category_id=cat_extras.id, icon="🍚"),
        Product(name="Ensalada", description="Ensalada fresca", price=12.00,
                category_id=cat_extras.id, icon="🥗"),
    ]
    db.add_all(products)
    db.flush()

    # ─── PERFILES DE REPARTIDORES ────────────────────────────────
    profiles = [
        DeliveryProfile(
            user_id=driver1.id, document_id="12345678",
            vehicle_type=VehicleType.MOTO, vehicle_plate="ABC-1234",
            license_number="L123456", insurance_number="SEG-001",
            bank_name="BCP", bank_account="1234567890",
            is_available=True, latitude=-14.0640, longitude=-75.7290,
            current_zone="Centro", total_deliveries=156, average_rating=4.8,
            total_earnings=12450.00,
        ),
        DeliveryProfile(
            user_id=driver2.id, document_id="12345679",
            vehicle_type=VehicleType.BICICLETA,
            bank_name="Interbank", bank_account="9876543210",
            is_available=True, latitude=-14.0660, longitude=-75.7310,
            current_zone="La Noria", total_deliveries=98, average_rating=4.6,
            total_earnings=8500.00,
        ),
        DeliveryProfile(
            user_id=driver3.id, document_id="12345680",
            vehicle_type=VehicleType.MOTO, vehicle_plate="DEF-5678",
            license_number="L789012",
            is_available=True, latitude=-14.0700, longitude=-75.7250,
            current_zone="Ica", total_deliveries=203, average_rating=4.9,
            total_earnings=15200.00,
        ),
        DeliveryProfile(
            user_id=driver4.id, document_id="12345681",
            vehicle_type=VehicleType.AUTO, vehicle_plate="GHI-9012",
            is_available=False, latitude=-14.0580, longitude=-75.7350,
            current_zone="San Isidro", total_deliveries=45, average_rating=3.8,
            total_earnings=3500.00,
        ),
    ]
    db.add_all(profiles)

    # ─── DIRECCIONES DEL CLIENTE ──────────────────────────────────
    addresses = [
        Address(
            user_id=cliente.id, label="Casa",
            full_address="Av. Principal 123, La Noria",
            district="La Noria", city="Ica", is_default=True,
            latitude=-14.0640, longitude=-75.7290,
        ),
        Address(
            user_id=cliente.id, label="Oficina",
            full_address="Jr. Flores 456, Centro",
            district="Centro", city="Ica",
        ),
    ]
    db.add_all(addresses)

    # ─── CUPONES ─────────────────────────────────────────────────
    coupons = [
        Coupon(
            code="BIENVENIDO", description="10% de descuento en tu primer pedido",
            discount_percent=10.0, min_order_amount=30.0, max_uses=100,
        ),
        Coupon(
            code="POLLO5", description="S/5 de descuento",
            discount_amount=5.0, min_order_amount=25.0, max_uses=50,
        ),
        Coupon(
            code="DELIVERY0", description="Delivery gratis",
            discount_amount=5.0, min_order_amount=50.0, max_uses=30,
        ),
    ]
    db.add_all(coupons)

    db.commit()
    print("✅ Datos de demostración creados exitosamente!")
    print("   👤 admin@chikenhot.pe / admin123")
    print("   👤 cliente@chikenhot.pe / cliente123")
    print("   👤 delivery@chikenhot.pe / delivery123")
