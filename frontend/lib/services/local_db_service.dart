import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// Offline-first local SQLite database.
/// Stores instruments, test sessions, observations, and sync queue.
class LocalDbService {
  static final LocalDbService instance = LocalDbService._();
  LocalDbService._();

  Database? _db;

  Future<void> init() async {
    final path = join(await getDatabasesPath(), 'nawi_local.db');
    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE IF NOT EXISTS instruments (
            id TEXT PRIMARY KEY,
            instrument_id TEXT,
            data TEXT NOT NULL,
            synced INTEGER DEFAULT 1,
            updated_at TEXT
          )
        ''');
        await db.execute('''
          CREATE TABLE IF NOT EXISTS test_sessions (
            id TEXT PRIMARY KEY,
            session_id TEXT UNIQUE,
            instrument_id TEXT,
            data TEXT NOT NULL,
            synced INTEGER DEFAULT 1,
            created_at TEXT
          )
        ''');
        await db.execute('''
          CREATE TABLE IF NOT EXISTS test_results (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            module_id TEXT,
            data TEXT NOT NULL,
            synced INTEGER DEFAULT 1
          )
        ''');
        await db.execute('''
          CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            operation TEXT,
            entity_type TEXT,
            entity_id TEXT,
            payload TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT,
            attempt_count INTEGER DEFAULT 0
          )
        ''');
      },
    );
  }

  Database get db => _db!;

  // ─── Instruments ─────────────────────────────────────────────────────────────
  Future<void> upsertInstrument(Map<String, dynamic> instrument) async {
    await db.insert(
      'instruments',
      {
        'id': instrument['_id']?.toString() ?? instrument['instrumentId'],
        'instrument_id': instrument['instrumentId'],
        'data': jsonEncode(instrument),
        'synced': 1,
        'updated_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getInstruments() async {
    final rows = await db.query('instruments', orderBy: 'updated_at DESC');
    return rows.map((r) => jsonDecode(r['data'] as String) as Map<String, dynamic>).toList();
  }

  Future<Map<String, dynamic>?> getInstrumentById(String instrumentId) async {
    final rows = await db.query('instruments', where: 'instrument_id = ?', whereArgs: [instrumentId]);
    if (rows.isEmpty) return null;
    return jsonDecode(rows.first['data'] as String) as Map<String, dynamic>;
  }

  // ─── Test Sessions ─────────────────────────────────────────────────────────
  Future<void> upsertSession(Map<String, dynamic> session) async {
    await db.insert(
      'test_sessions',
      {
        'id': session['_id']?.toString() ?? session['sessionId'],
        'session_id': session['sessionId'],
        'instrument_id': session['instrumentId'],
        'data': jsonEncode(session),
        'synced': 1,
        'created_at': session['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getSessions() async {
    final rows = await db.query('test_sessions', orderBy: 'created_at DESC');
    return rows.map((r) => jsonDecode(r['data'] as String) as Map<String, dynamic>).toList();
  }

  Future<void> upsertTestResult(Map<String, dynamic> result) async {
    await db.insert(
      'test_results',
      {
        'id': '${result['sessionId']}_${result['testModuleId']}',
        'session_id': result['sessionId'],
        'module_id': result['testModuleId'],
        'data': jsonEncode(result),
        'synced': 1,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getTestResults(String sessionId) async {
    final rows = await db.query('test_results', where: 'session_id = ?', whereArgs: [sessionId]);
    return rows.map((r) => jsonDecode(r['data'] as String) as Map<String, dynamic>).toList();
  }

  // ─── Sync Queue ───────────────────────────────────────────────────────────
  Future<void> enqueue({
    required String operation,
    required String entityType,
    String? entityId,
    required Map<String, dynamic> payload,
  }) async {
    await db.insert('sync_queue', {
      'id': '${DateTime.now().millisecondsSinceEpoch}_${entityType}_$operation',
      'operation': operation,
      'entity_type': entityType,
      'entity_id': entityId ?? '',
      'payload': jsonEncode(payload),
      'status': 'pending',
      'created_at': DateTime.now().toIso8601String(),
      'attempt_count': 0,
    });
  }

  Future<List<Map<String, dynamic>>> getPendingQueue() async {
    return db.query('sync_queue', where: "status = 'pending'", orderBy: 'created_at ASC');
  }

  Future<void> updateQueueStatus(String id, String status, {String? error}) async {
    await db.update(
      'sync_queue',
      {'status': status, if (error != null) 'error': error},
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
