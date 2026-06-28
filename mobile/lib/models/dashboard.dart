import '../core/format.dart';
import 'user.dart';

/// GET /dashboard/admin
class AdminDashboard {
  AdminDashboard({
    required this.ordersToday,
    required this.ordersChangePercent,
    required this.revenueToday,
    required this.revenueChangePercent,
    required this.activeUsers,
    required this.totalDrivers,
    required this.availableDrivers,
    required this.pendingOrders,
  });

  final int ordersToday;
  final int ordersChangePercent;
  final double revenueToday;
  final int revenueChangePercent;
  final int activeUsers;
  final int totalDrivers;
  final int availableDrivers;
  final int pendingOrders;

  factory AdminDashboard.fromJson(Map<String, dynamic> j) => AdminDashboard(
        ordersToday: (j['orders_today'] as num?)?.toInt() ?? 0,
        ordersChangePercent: (j['orders_change_percent'] as num?)?.toInt() ?? 0,
        revenueToday: (j['revenue_today'] as num?)?.toDouble() ?? 0,
        revenueChangePercent: (j['revenue_change_percent'] as num?)?.toInt() ?? 0,
        activeUsers: (j['active_users'] as num?)?.toInt() ?? 0,
        totalDrivers: (j['total_drivers'] as num?)?.toInt() ?? 0,
        availableDrivers: (j['available_drivers'] as num?)?.toInt() ?? 0,
        pendingOrders: (j['pending_orders'] as num?)?.toInt() ?? 0,
      );
}

/// GET /dashboard/customer
class CustomerDashboard {
  CustomerDashboard({
    required this.totalOrders,
    required this.activeOrders,
    required this.points,
    required this.membershipLevel,
    required this.lastOrderTotal,
    this.lastOrderDate,
  });

  final int totalOrders;
  final int activeOrders;
  final int points;
  final MembershipLevel membershipLevel;
  final double lastOrderTotal;
  final DateTime? lastOrderDate;

  factory CustomerDashboard.fromJson(Map<String, dynamic> j) => CustomerDashboard(
        totalOrders: (j['total_orders'] as num?)?.toInt() ?? 0,
        activeOrders: (j['active_orders'] as num?)?.toInt() ?? 0,
        points: (j['points'] as num?)?.toInt() ?? 0,
        membershipLevel: MembershipLevel.fromApi(j['membership_level'] as String?),
        lastOrderTotal: (j['last_order_total'] as num?)?.toDouble() ?? 0,
        lastOrderDate: Fmt.parseUtc(j['last_order_date'] as String?),
      );
}

/// GET /users/stats
class UserStats {
  UserStats({
    required this.totalUsers,
    required this.activeUsers,
    required this.customers,
    required this.drivers,
    required this.admins,
    required this.newThisWeek,
  });

  final int totalUsers;
  final int activeUsers;
  final int customers;
  final int drivers;
  final int admins;
  final int newThisWeek;

  factory UserStats.fromJson(Map<String, dynamic> j) => UserStats(
        totalUsers: (j['total_users'] as num?)?.toInt() ?? 0,
        activeUsers: (j['active_users'] as num?)?.toInt() ?? 0,
        customers: (j['customers'] as num?)?.toInt() ?? 0,
        drivers: (j['drivers'] as num?)?.toInt() ?? 0,
        admins: (j['admins'] as num?)?.toInt() ?? 0,
        newThisWeek: (j['new_this_week'] as num?)?.toInt() ?? 0,
      );
}
