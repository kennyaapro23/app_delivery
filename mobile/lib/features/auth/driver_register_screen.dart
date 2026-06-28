import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:chikenhot/core/api_client.dart';
import 'package:chikenhot/core/theme.dart';
import 'package:chikenhot/providers/auth_provider.dart';

/// Registro de repartidor — asistente de 4 pasos.
/// Espejo de frontend/src/pages/DriverRegisterPage.tsx.
class DriverRegisterScreen extends ConsumerStatefulWidget {
  const DriverRegisterScreen({super.key});

  @override
  ConsumerState<DriverRegisterScreen> createState() =>
      _DriverRegisterScreenState();
}

class _DriverRegisterScreenState extends ConsumerState<DriverRegisterScreen> {
  int _step = 1; // 1..4
  bool _loading = false;
  String? _error;

  // ── Paso 1: Cuenta ──────────────────────────────────────
  final _fullName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();

  // ── Paso 2: Personal / Dirección / Emergencia ───────────
  final _documentId = TextEditingController();
  String? _birthDate; // ISO yyyy-MM-dd
  String? _gender; // masculino / femenino / otro
  final _homeAddress = TextEditingController();
  final _homeDistrict = TextEditingController();
  final _emergencyName = TextEditingController();
  final _emergencyPhone = TextEditingController();
  final _emergencyRelation = TextEditingController();

  // ── Paso 3: Vehículo ────────────────────────────────────
  String _vehicleType = 'moto'; // moto / bicicleta / auto
  final _vehicleBrand = TextEditingController();
  final _vehicleModel = TextEditingController();
  final _vehicleYear = TextEditingController();
  final _vehicleColor = TextEditingController();
  final _vehiclePlate = TextEditingController();
  final _licenseNumber = TextEditingController();
  String? _licenseExpiry;
  final _insuranceNumber = TextEditingController();
  String? _insuranceExpiry;

  // ── Paso 4: Banco ───────────────────────────────────────
  final _bankName = TextEditingController();
  String _bankAccountType = 'ahorros'; // ahorros / corriente
  final _bankAccount = TextEditingController();
  final _bankCci = TextEditingController();
  final _bankAccountHolder = TextEditingController();

  static const _vehicles = <(String, String, String)>[
    ('moto', 'Moto', '🏍️'),
    ('bicicleta', 'Bicicleta', '🚲'),
    ('auto', 'Auto', '🚗'),
  ];
  static const _genders = <(String, String)>[
    ('masculino', 'Masculino'),
    ('femenino', 'Femenino'),
    ('otro', 'Otro'),
  ];
  static const _bankTypes = <(String, String)>[
    ('ahorros', 'Ahorros'),
    ('corriente', 'Corriente'),
  ];
  static const _steps = <(int, String, IconData)>[
    (1, 'Cuenta', Icons.person_outline),
    (2, 'Personal', Icons.description_outlined),
    (3, 'Vehículo', Icons.directions_car_outlined),
    (4, 'Banco', Icons.credit_card_outlined),
  ];

  @override
  void dispose() {
    _fullName.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    _documentId.dispose();
    _homeAddress.dispose();
    _homeDistrict.dispose();
    _emergencyName.dispose();
    _emergencyPhone.dispose();
    _emergencyRelation.dispose();
    _vehicleBrand.dispose();
    _vehicleModel.dispose();
    _vehicleYear.dispose();
    _vehicleColor.dispose();
    _vehiclePlate.dispose();
    _licenseNumber.dispose();
    _insuranceNumber.dispose();
    _bankName.dispose();
    _bankAccount.dispose();
    _bankCci.dispose();
    _bankAccountHolder.dispose();
    super.dispose();
  }

  // ── Validación por paso ─────────────────────────────────
  String? _validateStep1() {
    if (_fullName.text.trim().length < 3) {
      return 'El nombre debe tener al menos 3 caracteres';
    }
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(_email.text.trim())) {
      return 'Email inválido';
    }
    if (_password.text.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    if (_password.text != _confirmPassword.text) {
      return 'Las contraseñas no coinciden';
    }
    if (_phone.text.trim().length < 6) {
      return 'El teléfono es obligatorio';
    }
    return null;
  }

  String? _validateStep2() {
    if (_documentId.text.trim().length < 6) {
      return 'El DNI/Documento es obligatorio';
    }
    if (_birthDate == null || _birthDate!.isEmpty) {
      return 'La fecha de nacimiento es obligatoria';
    }
    return null;
  }

  String? _validateStep3() {
    if (_vehicleType.isEmpty) return 'Selecciona un tipo de vehículo';
    if (_vehicleType != 'bicicleta' && _vehiclePlate.text.trim().length < 3) {
      return 'La placa del vehículo es obligatoria';
    }
    return null;
  }

  void _goNext() {
    final err = switch (_step) {
      1 => _validateStep1(),
      2 => _validateStep2(),
      3 => _validateStep3(),
      _ => null,
    };
    if (err != null) {
      setState(() => _error = err);
      return;
    }
    setState(() {
      _error = null;
      _step++;
    });
  }

  void _goBack() {
    setState(() {
      _error = null;
      _step--;
    });
  }

  /// Devuelve el valor recortado, o null si está vacío (omite opcionales).
  String? _opt(TextEditingController c) {
    final v = c.text.trim();
    return v.isEmpty ? null : v;
  }

  Future<void> _pickDate(String? current, ValueChanged<String> onPicked) async {
    final now = DateTime.now();
    DateTime initial = DateTime(now.year - 25);
    if (current != null && current.isNotEmpty) {
      initial = DateTime.tryParse(current) ?? initial;
    }
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1940),
      lastDate: DateTime(now.year + 10),
    );
    if (picked != null) {
      final iso =
          '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      onPicked(iso);
    }
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final payload = <String, dynamic>{
        'email': _email.text.trim(),
        'password': _password.text,
        'full_name': _fullName.text.trim(),
        'vehicle_type': _vehicleType,
        'bank_account_type': _bankAccountType,
      };
      void put(String key, String? value) {
        if (value != null) payload[key] = value;
      }

      put('phone', _opt(_phone));
      put('document_id', _opt(_documentId));
      if (_birthDate != null && _birthDate!.isNotEmpty) {
        payload['birth_date'] = _birthDate;
      }
      if (_gender != null) payload['gender'] = _gender;
      put('home_address', _opt(_homeAddress));
      put('home_district', _opt(_homeDistrict));
      put('emergency_contact_name', _opt(_emergencyName));
      put('emergency_contact_phone', _opt(_emergencyPhone));
      put('emergency_contact_relation', _opt(_emergencyRelation));
      put('vehicle_brand', _opt(_vehicleBrand));
      put('vehicle_model', _opt(_vehicleModel));
      final year = int.tryParse(_vehicleYear.text.trim());
      if (year != null) payload['vehicle_year'] = year;
      put('vehicle_color', _opt(_vehicleColor));
      put('vehicle_plate', _opt(_vehiclePlate));
      put('license_number', _opt(_licenseNumber));
      if (_licenseExpiry != null && _licenseExpiry!.isNotEmpty) {
        payload['license_expiry'] = _licenseExpiry;
      }
      put('insurance_number', _opt(_insuranceNumber));
      if (_insuranceExpiry != null && _insuranceExpiry!.isNotEmpty) {
        payload['insurance_expiry'] = _insuranceExpiry;
      }
      put('bank_name', _opt(_bankName));
      put('bank_account', _opt(_bankAccount));
      put('bank_cci', _opt(_bankCci));
      put('bank_account_holder', _opt(_bankAccountHolder));

      await ref.read(authProvider.notifier).registerDriver(payload);
      if (!mounted) return;
      context.go('/delivery');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = getErrorMessage(e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go('/login')),
        title: const Text('Únete como repartidor'),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _header(),
                      const SizedBox(height: 20),
                      _stepper(),
                      const SizedBox(height: 24),
                      _stepContent(),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        _errorBox(_error!),
                      ],
                      const SizedBox(height: 20),
                      _nav(),
                      const SizedBox(height: 16),
                      _footerLinks(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _header() {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: BrandColors.c100,
            shape: BoxShape.circle,
          ),
          child: const Text('🛵', style: TextStyle(fontSize: 30)),
        ),
        const SizedBox(height: 12),
        const Text(
          'Únete como repartidor',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        const Text(
          'Completa los 4 pasos para activar tu cuenta',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: Neutral.n500),
        ),
      ],
    );
  }

  Widget _stepper() {
    return Row(
      children: [
        for (var i = 0; i < _steps.length; i++) ...[
          _stepDot(_steps[i]),
          if (i < _steps.length - 1)
            Expanded(
              child: Container(
                height: 2,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                color: _step > _steps[i].$1
                    ? const Color(0xFF22C55E)
                    : Neutral.n200,
              ),
            ),
        ],
      ],
    );
  }

  Widget _stepDot((int, String, IconData) s) {
    final n = s.$1;
    final done = _step > n;
    final active = _step == n;
    final Color bg = done
        ? const Color(0xFF22C55E)
        : active
            ? BrandColors.c500
            : Neutral.n200;
    final Color fg = (done || active) ? Colors.white : Neutral.n500;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 36,
          height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: bg,
            shape: BoxShape.circle,
            border: active
                ? Border.all(color: BrandColors.c100, width: 4)
                : null,
          ),
          child: done
              ? const Icon(Icons.check, size: 18, color: Colors.white)
              : Text('$n',
                  style: TextStyle(
                      color: fg, fontWeight: FontWeight.w800, fontSize: 13)),
        ),
        const SizedBox(height: 4),
        Text(
          s.$2,
          style: TextStyle(
            fontSize: 11,
            color: active ? BrandColors.c600 : Neutral.n400,
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _stepContent() {
    return switch (_step) {
      1 => _step1(),
      2 => _step2(),
      3 => _step3(),
      _ => _step4(),
    };
  }

  // ── PASO 1 ──────────────────────────────────────────────
  Widget _step1() {
    return _section(
      'Datos de la cuenta',
      Icons.person_outline,
      [
        _field(
          label: 'Nombre completo',
          required: true,
          child: _input(_fullName, hint: 'Juan Pérez', textCap: true),
        ),
        _grid2([
          _field(
            label: 'Email',
            required: true,
            child: _input(_email,
                hint: 'tu@email.com',
                keyboard: TextInputType.emailAddress),
          ),
          _field(
            label: 'Teléfono',
            required: true,
            child: _input(_phone,
                hint: '+51 999 999 999', keyboard: TextInputType.phone),
          ),
        ]),
        _grid2([
          _field(
            label: 'Contraseña',
            required: true,
            child: _input(_password, hint: 'Mínimo 6 caracteres', obscure: true),
          ),
          _field(
            label: 'Confirmar contraseña',
            required: true,
            child: _input(_confirmPassword, hint: 'Repítela', obscure: true),
          ),
        ]),
      ],
    );
  }

  // ── PASO 2 ──────────────────────────────────────────────
  Widget _step2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _section('Información personal', Icons.description_outlined, [
          _grid2([
            _field(
              label: 'DNI / Documento',
              required: true,
              child: _input(_documentId, hint: '12345678'),
            ),
            _field(
              label: 'Fecha de nacimiento',
              required: true,
              child: _dateField(_birthDate, 'Selecciona una fecha',
                  () => _pickDate(_birthDate, (v) => setState(() => _birthDate = v))),
            ),
          ]),
          _field(
            label: 'Género',
            child: Row(
              children: [
                for (final g in _genders) ...[
                  Expanded(
                    child: _choiceChip(
                      label: g.$2,
                      selected: _gender == g.$1,
                      onTap: () => setState(() => _gender = g.$1),
                    ),
                  ),
                  if (g != _genders.last) const SizedBox(width: 8),
                ],
              ],
            ),
          ),
        ]),
        const SizedBox(height: 16),
        _section('Dirección domiciliaria', Icons.location_on_outlined, [
          _field(
            label: 'Dirección',
            child: _input(_homeAddress, hint: 'Av. Larco 1234'),
          ),
          _field(
            label: 'Distrito',
            child: _input(_homeDistrict, hint: 'Miraflores'),
          ),
        ]),
        const SizedBox(height: 16),
        _section('Contacto de emergencia', Icons.favorite_border, [
          _grid2([
            _field(
              label: 'Nombre completo',
              child: _input(_emergencyName, hint: 'María Pérez'),
            ),
            _field(
              label: 'Teléfono',
              child: _input(_emergencyPhone,
                  hint: '+51 999 888 777', keyboard: TextInputType.phone),
            ),
          ]),
          _field(
            label: 'Relación',
            child: _input(_emergencyRelation, hint: 'Madre, pareja, hermano…'),
          ),
        ]),
      ],
    );
  }

  // ── PASO 3 ──────────────────────────────────────────────
  Widget _step3() {
    final plateRequired = _vehicleType != 'bicicleta';
    return _section('Vehículo', Icons.directions_car_outlined, [
      _field(
        label: 'Tipo de vehículo',
        required: true,
        child: Row(
          children: [
            for (final v in _vehicles) ...[
              Expanded(
                child: _vehicleCard(
                  emoji: v.$3,
                  label: v.$2,
                  selected: _vehicleType == v.$1,
                  onTap: () => setState(() => _vehicleType = v.$1),
                ),
              ),
              if (v != _vehicles.last) const SizedBox(width: 12),
            ],
          ],
        ),
      ),
      _grid2([
        _field(
          label: 'Marca',
          child: _input(_vehicleBrand, hint: 'Honda, Yamaha…'),
        ),
        _field(
          label: 'Modelo',
          child: _input(_vehicleModel, hint: 'CG 150, FZ16…'),
        ),
      ]),
      _grid2([
        _field(
          label: 'Año',
          child: _input(_vehicleYear,
              hint: '2022', keyboard: TextInputType.number),
        ),
        _field(
          label: 'Color',
          child: _input(_vehicleColor, hint: 'Rojo, Negro…'),
        ),
      ]),
      _field(
        label: 'Placa',
        required: plateRequired,
        child: _input(_vehiclePlate, hint: 'ABC-123', upper: true),
      ),
      const SizedBox(height: 4),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Neutral.n50,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'DOCUMENTACIÓN (OPCIONAL)',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Neutral.n600,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 12),
            _grid2([
              _field(
                label: 'N° de licencia',
                child: _input(_licenseNumber),
              ),
              _field(
                label: 'Vencimiento licencia',
                child: _dateField(_licenseExpiry, 'Selecciona',
                    () => _pickDate(_licenseExpiry,
                        (v) => setState(() => _licenseExpiry = v))),
              ),
            ]),
            _grid2([
              _field(
                label: 'N° de seguro / SOAT',
                child: _input(_insuranceNumber),
              ),
              _field(
                label: 'Vencimiento seguro',
                child: _dateField(_insuranceExpiry, 'Selecciona',
                    () => _pickDate(_insuranceExpiry,
                        (v) => setState(() => _insuranceExpiry = v))),
              ),
            ]),
          ],
        ),
      ),
    ]);
  }

  // ── PASO 4 ──────────────────────────────────────────────
  Widget _step4() {
    return _section('Datos bancarios (para tus pagos)', Icons.credit_card_outlined, [
      _grid2([
        _field(
          label: 'Banco',
          child: _input(_bankName, hint: 'BCP, Interbank, BBVA, Scotiabank…'),
        ),
        _field(
          label: 'Tipo de cuenta',
          child: Row(
            children: [
              for (final b in _bankTypes) ...[
                Expanded(
                  child: _choiceChip(
                    label: b.$2,
                    selected: _bankAccountType == b.$1,
                    onTap: () => setState(() => _bankAccountType = b.$1),
                  ),
                ),
                if (b != _bankTypes.last) const SizedBox(width: 8),
              ],
            ],
          ),
        ),
      ]),
      _field(
        label: 'Número de cuenta',
        child: _input(_bankAccount, hint: '194-12345678-0-01'),
      ),
      _field(
        label: 'CCI (Código de Cuenta Interbancario)',
        child: _input(_bankCci, hint: '002-194-001234567890-01'),
      ),
      _field(
        label: 'Titular de la cuenta',
        child: _input(_bankAccountHolder, hint: 'Como aparece en el banco'),
      ),
      const SizedBox(height: 4),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFEFF6FF),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Text(
          '💡 Tus datos bancarios son seguros y solo se usan para depositar tus ganancias.',
          style: TextStyle(fontSize: 12, color: Color(0xFF1E40AF)),
        ),
      ),
    ]);
  }

  // ── Navegación inferior ─────────────────────────────────
  Widget _nav() {
    return Row(
      children: [
        if (_step > 1) ...[
          Expanded(
            child: OutlinedButton(
              onPressed: _loading ? null : _goBack,
              child: const Text('← Volver'),
            ),
          ),
          const SizedBox(width: 8),
        ],
        Expanded(
          child: _step < 4
              ? ElevatedButton(
                  onPressed: _loading ? null : _goNext,
                  child: const Text('Continuar →'),
                )
              : ElevatedButton.icon(
                  onPressed: _loading ? null : _submit,
                  icon: _loading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.pedal_bike, size: 18),
                  label: Text(_loading
                      ? 'Creando cuenta...'
                      : 'Crear cuenta de repartidor'),
                ),
        ),
      ],
    );
  }

  Widget _footerLinks() {
    return Column(
      children: [
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            const Text('¿Ya tienes cuenta? ',
                style: TextStyle(fontSize: 13, color: Neutral.n600)),
            GestureDetector(
              onTap: () => context.go('/login'),
              child: const Text(
                'Inicia sesión',
                style: TextStyle(
                    fontSize: 13,
                    color: BrandColors.c600,
                    fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            const Text('¿Eres cliente? ',
                style: TextStyle(fontSize: 12, color: Neutral.n400)),
            GestureDetector(
              onTap: () => context.go('/register'),
              child: const Text(
                'Regístrate aquí',
                style: TextStyle(fontSize: 12, color: Neutral.n500),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ── Componentes reutilizables ───────────────────────────
  Widget _section(String title, IconData icon, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: BrandColors.c500),
            const SizedBox(width: 8),
            Text(
              title.toUpperCase(),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Neutral.n600,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        for (final c in children) ...[
          c,
          if (c != children.last) const SizedBox(height: 12),
        ],
      ],
    );
  }

  Widget _grid2(List<Widget> children) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < children.length; i++) ...[
          Expanded(child: children[i]),
          if (i < children.length - 1) const SizedBox(width: 12),
        ],
      ],
    );
  }

  Widget _field({
    required String label,
    bool required = false,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600)),
            if (required)
              const Text(' *',
                  style: TextStyle(color: Color(0xFFEF4444), fontSize: 13)),
          ],
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }

  Widget _input(
    TextEditingController controller, {
    String? hint,
    bool obscure = false,
    bool upper = false,
    bool textCap = false,
    TextInputType? keyboard,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      enabled: !_loading,
      keyboardType: keyboard,
      textCapitalization: upper
          ? TextCapitalization.characters
          : textCap
              ? TextCapitalization.words
              : TextCapitalization.none,
      style: upper ? const TextStyle(letterSpacing: 1) : null,
      onChanged: upper
          ? (v) {
              final up = v.toUpperCase();
              if (up != v) {
                controller.value = controller.value.copyWith(
                  text: up,
                  selection: TextSelection.collapsed(offset: up.length),
                );
              }
            }
          : null,
      decoration: InputDecoration(hintText: hint, isDense: true),
    );
  }

  Widget _dateField(String? value, String placeholder, VoidCallback onTap) {
    final has = value != null && value.isNotEmpty;
    return InkWell(
      onTap: _loading ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: const InputDecoration(isDense: true),
        child: Row(
          children: [
            Expanded(
              child: Text(
                has ? value : placeholder,
                style: TextStyle(
                  color: has ? Neutral.n900 : Neutral.n400,
                  fontSize: 14,
                ),
              ),
            ),
            const Icon(Icons.calendar_today_outlined,
                size: 16, color: Neutral.n400),
          ],
        ),
      ),
    );
  }

  Widget _choiceChip({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? BrandColors.c50 : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? BrandColors.c500 : Neutral.n200,
            width: 2,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? BrandColors.c700 : Neutral.n700,
          ),
        ),
      ),
    );
  }

  Widget _vehicleCard({
    required String emoji,
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? BrandColors.c50 : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? BrandColors.c500 : Neutral.n200,
            width: 2,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 4),
            Text(label,
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _errorBox(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        message,
        style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13),
      ),
    );
  }
}
