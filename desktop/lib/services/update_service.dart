import 'dart:io';
import 'package:dio/dio.dart';
import 'package:open_file/open_file.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import '../constants/api_constants.dart';
import '../models/version_info.dart';

class UpdateService {
  final Dio _dio = Dio();

  // Check if a new version is available on the server
  Future<VersionInfo?> checkForUpdate() async {
    try {
      final response = await _dio.get(ApiConstants.versionCheck);
      if (response.statusCode == 200 && response.data['success'] == true) {
        final versionInfo = VersionInfo.fromJson(response.data['data']);
        final packageInfo = await PackageInfo.fromPlatform();

        final currentBuild = int.tryParse(packageInfo.buildNumber) ?? 1;
        final currentVersion = packageInfo.version;

        // Compare build number or version string
        if (versionInfo.buildNumber > currentBuild ||
            _isVersionGreater(versionInfo.version, currentVersion)) {
          return versionInfo;
        }
      }
    } catch (_) {
      // Offline or server temporarily unreachable
    }
    return null;
  }

  // Download .exe / .dmg installer and launch it
  Future<bool> downloadAndInstall({
    required VersionInfo versionInfo,
    required Function(double progress, String downloadedMb) onProgress,
  }) async {
    try {
      final downloadUrl = Platform.isWindows
          ? versionInfo.downloadUrlWindows
          : versionInfo.downloadUrlMacos;

      if (downloadUrl.isEmpty) return false;

      final tempDir = await getTemporaryDirectory();
      final fileName = Platform.isWindows
          ? 'AutoPrime-Setup-${versionInfo.version}.exe'
          : 'AutoPrime-Setup-${versionInfo.version}.dmg';
      final savePath = '${tempDir.path}/$fileName';

      // Download file with progress callback
      await _dio.download(
        downloadUrl,
        savePath,
        onReceiveProgress: (received, total) {
          if (total > 0) {
            final progress = received / total;
            final receivedMb = (received / (1024 * 1024)).toStringAsFixed(1);
            final totalMb = (total / (1024 * 1024)).toStringAsFixed(1);
            onProgress(progress, '$receivedMb / $totalMb MB');
          }
        },
      );

      // Launch installer
      if (Platform.isWindows) {
        await Process.start(savePath, ['/SILENT'], mode: ProcessStartMode.detached);
        exit(0);
      } else if (Platform.isMacOS) {
        await Process.run('open', [savePath]);
        exit(0);
      }

      return true;
    } catch (e) {
      // ignore: avoid_print
      print('UpdateService downloadAndInstall error: $e');
      return false;
    }
  }

  bool _isVersionGreater(String newVersion, String currentVersion) {
    try {
      List<int> v1 = newVersion.split('.').map(int.parse).toList();
      List<int> v2 = currentVersion.split('.').map(int.parse).toList();

      for (int i = 0; i < v1.length && i < v2.length; i++) {
        if (v1[i] > v2[i]) return true;
        if (v1[i] < v2[i]) return false;
      }
      return v1.length > v2.length;
    } catch (_) {
      return false;
    }
  }
}
