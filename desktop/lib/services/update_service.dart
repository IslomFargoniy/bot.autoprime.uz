import 'dart:io';
import 'package:dio/dio.dart';
import 'package:open_file/open_file.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import '../constants/api_constants.dart';
import '../constants/app_version.dart';
import '../models/version_info.dart';

class UpdateService {
  final Dio _dio = Dio();

  // Check if a new version is available on the server
  Future<VersionInfo?> checkForUpdate() async {
    try {
      final response = await _dio.get(ApiConstants.versionCheck);
      if (response.statusCode == 200 && response.data['success'] == true) {
        final versionInfo = VersionInfo.fromJson(response.data['data']);

        String currentVersion = AppVersion.version;
        int currentBuild = AppVersion.buildNumber;

        try {
          final packageInfo = await PackageInfo.fromPlatform();
          if (packageInfo.version.isNotEmpty &&
              packageInfo.version != '0.0.0' &&
              packageInfo.version != '1.0.0') {
            if (_isVersionGreater(packageInfo.version, currentVersion)) {
              currentVersion = packageInfo.version;
            }
          }
          final pkgBuild = int.tryParse(packageInfo.buildNumber);
          if (pkgBuild != null && pkgBuild > currentBuild) {
            currentBuild = pkgBuild;
          }
        } catch (_) {}

        // Compare: only notify update if remote version is strictly greater,
        // or build is greater on the exact same version
        final isNewerVersion = _isVersionGreater(versionInfo.version, currentVersion);
        final isNewerBuild =
            versionInfo.version == currentVersion && versionInfo.buildNumber > currentBuild;

        if (isNewerVersion || isNewerBuild) {
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
