import 'package:flutter_test/flutter_test.dart';
import 'package:unihub_mobile/main.dart';

void main() {
  testWidgets('renders UniHub mobile check-in UI', (WidgetTester tester) async {
    await tester.pumpWidget(const UniHubMobileApp());
    await tester.pumpAndSettle();

    expect(find.text('UniHub Workshop Check-in'), findsOneWidget);
    expect(
      find.text('Room B3 · Design Systems for Student Builders'),
      findsOneWidget,
    );
    expect(find.text('Scan student QR'), findsOneWidget);
  });
}
