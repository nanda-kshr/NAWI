import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'local_db_service.dart';

enum SyncStatus { idle, syncing, error, offline }

class SyncService extends ChangeNotifier {
  SyncStatus _status = SyncStatus.idle;
  String? _lastError;
  bool _isOnline = true;

  SyncStatus get status => _status;
  String? get lastError => _lastError;
  bool get isOnline => _isOnline;

  SyncService() {
    Connectivity().onConnectivityChanged.listen((results) {
      final wasOffline = !_isOnline;
      _isOnline = results.any((r) => r != ConnectivityResult.none);
      notifyListeners();
      // Auto-sync when coming back online
      if (wasOffline && _isOnline) sync();
    });
  }

  Future<void> sync() async {
    if (!_isOnline) return;
    _status = SyncStatus.syncing;
    notifyListeners();

    try {
      final queue = await LocalDbService.instance.getPendingQueue();
      // In a real implementation, process each queued operation
      // against the backend API here
      for (final item in queue) {
        // Stub: mark done (real implementation would call API)
        await LocalDbService.instance.updateQueueStatus(
          item['id'] as String,
          'done',
        );
      }
      _status = SyncStatus.idle;
      _lastError = null;
    } catch (e) {
      _status = SyncStatus.error;
      _lastError = e.toString();
    }
    notifyListeners();
  }
}
