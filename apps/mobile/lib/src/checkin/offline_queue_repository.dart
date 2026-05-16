import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import 'package:unihub_mobile/src/checkin/queued_scan.dart';

class OfflineQueueRepository {
  Database? _database;

  Future<Database> get _db async {
    if (_database != null) return _database!;
    final path = join(await getDatabasesPath(), 'unihub_checkin.db');
    _database = await openDatabase(
      path,
      version: 1,
      onCreate: (db, _) => db.execute('''
        CREATE TABLE queued_scans(
          local_id TEXT PRIMARY KEY,
          qr_code TEXT NOT NULL,
          scanned_at TEXT NOT NULL,
          status TEXT NOT NULL,
          registration_id TEXT,
          last_error TEXT
        )
      '''),
    );
    return _database!;
  }

  Future<void> upsert(QueuedScan scan) async {
    await (await _db).insert(
      'queued_scans',
      _toRow(scan),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<QueuedScan>> listAll() async {
    final rows = await (await _db).query(
      'queued_scans',
      orderBy: 'scanned_at DESC',
    );
    return rows.map(_fromRow).toList();
  }

  Future<List<QueuedScan>> listPending() async {
    final rows = await (await _db).query(
      'queued_scans',
      where: 'status IN (?, ?)',
      whereArgs: ['pending', 'failed'],
      orderBy: 'scanned_at ASC',
    );
    return rows.map(_fromRow).toList();
  }

  Future<void> deleteResolved() async {
    await (await _db).delete(
      'queued_scans',
      where: 'status IN (?, ?)',
      whereArgs: ['synced', 'invalid'],
    );
  }

  Map<String, Object?> _toRow(QueuedScan scan) => {
    'local_id': scan.localId,
    'qr_code': scan.qrCode,
    'scanned_at': scan.scannedAt.toIso8601String(),
    'status': scan.status.name,
    'registration_id': scan.registrationId,
    'last_error': scan.lastError,
  };

  QueuedScan _fromRow(Map<String, Object?> row) => QueuedScan(
    localId: row['local_id']! as String,
    qrCode: row['qr_code']! as String,
    scannedAt: DateTime.parse(row['scanned_at']! as String),
    status: QueueStatus.values.byName(row['status']! as String),
    registrationId: row['registration_id'] as String?,
    lastError: row['last_error'] as String?,
  );
}
