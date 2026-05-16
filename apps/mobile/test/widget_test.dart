import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:unihub_mobile/src/app.dart';

void main() {
  testWidgets('renders UniHub app shell', (WidgetTester tester) async {
    await tester.pumpWidget(const UniHubApp());
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
