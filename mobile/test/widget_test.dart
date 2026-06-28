import 'package:flutter_test/flutter_test.dart';

import 'package:chikenhot/models/order.dart';

void main() {
  test('OrderStatus mapea desde/hacia la API', () {
    expect(OrderStatus.fromApi('on_the_way'), OrderStatus.onTheWay);
    expect(OrderStatus.onTheWay.api, 'on_the_way');
    expect(OrderStatus.fromApi('delivered').isActive, false);
    expect(OrderStatus.pending.isActive, true);
  });
}
