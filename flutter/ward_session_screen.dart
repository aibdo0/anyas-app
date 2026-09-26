import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;

/// أضف إلى pubspec.yaml:
/// shared_preferences: ^2.3.2
/// flutter_local_notifications: ^17.2.3
/// timezone: ^0.9.4

// -----------------------------------------------------------------------------
// نماذج البيانات
// -----------------------------------------------------------------------------

enum WardType { morning, evening, sleep, general }

class WardItem {
  const WardItem({
    required this.text,
    this.repeat = 1,
    this.reference,
  });

  final String text;
  final int repeat;
  final String? reference;
}

class PrayerTimes {
  const PrayerTimes({
    required this.fajr,
    required this.dhuhr,
    required this.asr,
    required this.maghrib,
    required this.isha,
  });

  final DateTime fajr;
  final DateTime dhuhr;
  final DateTime asr;
  final DateTime maghrib;
  final DateTime isha;

  /// وقت صلاة الجمعة يُمرر من مواقيت المسجد أو إعدادات المستخدم.
  DateTime get fridayPrayer => dhuhr;
}

class FridayFeature {
  const FridayFeature({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.available,
    this.start,
    this.end,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool available;
  final DateTime? start;
  final DateTime? end;
}

// -----------------------------------------------------------------------------
// قواعد ميزات يوم الجمعة
// -----------------------------------------------------------------------------

class FridaySchedule {
  const FridaySchedule(
    this.prayerTimes, {
    this.salawatStartsAtFridayMaghrib = false,
  });

  final PrayerTimes prayerTimes;
  final bool salawatStartsAtFridayMaghrib;

  bool get isFriday => prayerTimes.dhuhr.weekday == DateTime.friday;

  /// ساعة الإجابة: من بعد العصر إلى المغرب، وهي من أشهر الأقوال في تحديدها.
  bool get isHourOfResponse {
    final now = DateTime.now();
    return isFriday &&
        !now.isBefore(prayerTimes.asr) &&
        now.isBefore(prayerTimes.maghrib);
  }

  /// صلاة الجمعة تكون يوم الجمعة وقت الظهر بحسب توقيت المسجد.
  bool get isFridayPrayerTime {
    final now = DateTime.now();
    final prayerStart = prayerTimes.fridayPrayer.subtract(const Duration(minutes: 45));
    final prayerEnd = prayerTimes.fridayPrayer.add(const Duration(hours: 1));
    return isFriday && !now.isBefore(prayerStart) && now.isBefore(prayerEnd);
  }

  /// اليوم الشرعي للجمعة يبدأ من مغرب الخميس وينتهي بمغرب الجمعة.
  /// إذا أردت حرفيًا جعله من مغرب الجمعة إلى مغرب السبت، بدّل start إلى fridayMaghrib.
  bool get isSalawatWindow {
    final now = DateTime.now();
    final start = salawatStart;
    final end = salawatEnd;
    return !now.isBefore(start) && now.isBefore(end);
  }

  DateTime get salawatStart => salawatStartsAtFridayMaghrib
      ? prayerTimes.maghrib
      : prayerTimes.maghrib.subtract(const Duration(days: 1));

  DateTime get salawatEnd => salawatStartsAtFridayMaghrib
      ? prayerTimes.maghrib.add(const Duration(days: 1))
      : prayerTimes.maghrib;

  List<FridayFeature> get features => [
        FridayFeature(
          title: 'سورة الكهف',
          subtitle: isFriday ? 'اقرأها في أي وقت من يوم الجمعة' : 'تظهر تلقائيًا يوم الجمعة',
          icon: Icons.menu_book_rounded,
          available: isFriday,
        ),
        FridayFeature(
          title: 'صلاة الجمعة',
          subtitle: isFridayPrayerTime ? 'حان وقتها، تقبل الله' : 'تذكير قبل صلاة الجمعة',
          icon: Icons.mosque_rounded,
          available: isFriday,
          start: prayerTimes.fridayPrayer,
        ),
        FridayFeature(
          title: 'ساعة الإجابة',
          subtitle: isHourOfResponse ? 'من بعد العصر إلى المغرب' : 'بعد العصر حتى المغرب',
          icon: Icons.hourglass_bottom_rounded,
          available: isHourOfResponse,
          start: prayerTimes.asr,
          end: prayerTimes.maghrib,
        ),
        FridayFeature(
          title: 'الصلاة على النبي ﷺ',
          subtitle: isSalawatWindow ? 'الوقت مفتوح حتى نهاية الفترة' : 'من مغرب الخميس إلى مغرب الجمعة',
          icon: Icons.favorite_rounded,
          available: isSalawatWindow,
          start: salawatStart,
          end: salawatEnd,
        ),
      ];
}

// -----------------------------------------------------------------------------
// شاشة جلسة الورد
// -----------------------------------------------------------------------------

class WardSessionScreen extends StatefulWidget {
  const WardSessionScreen({
    super.key,
    required this.title,
    required this.items,
    required this.type,
    required this.prayerTimes,
    this.onOpenFridayFeature,
  });

  final String title;
  final List<WardItem> items;
  final WardType type;
  final PrayerTimes prayerTimes;
  final ValueChanged<FridayFeature>? onOpenFridayFeature;

  @override
  State<WardSessionScreen> createState() => _WardSessionScreenState();
}

class _WardSessionScreenState extends State<WardSessionScreen> {
  late final PageController _pageController;
  late final String _progressKey;
  int _currentIndex = 0;
  final Set<int> _completed = <int>{};
  bool _autoNext = true;

  bool get isFinished => _completed.length == widget.items.length;
  double get progress => widget.items.isEmpty ? 0 : _completed.length / widget.items.length;

  @override
  void initState() {
    super.initState();
    _progressKey = 'ward_session_${widget.type.name}_${_todayKey()}';
    _pageController = PageController();
    _restoreProgress();
  }

  String _todayKey() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  Future<void> _restoreProgress() async {
    final prefs = await SharedPreferences.getInstance();
    final savedIndex = prefs.getInt('$_progressKey:index') ?? 0;
    final savedCompleted = prefs.getStringList('$_progressKey:completed') ?? <String>[];
    if (!mounted) return;
    setState(() {
      _currentIndex = savedIndex.clamp(0, widget.items.isEmpty ? 0 : widget.items.length - 1).toInt();
      _completed.addAll(savedCompleted.map(int.parse));
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_pageController.hasClients && _currentIndex > 0) {
        _pageController.jumpToPage(_currentIndex);
      }
    });
  }

  Future<void> _saveProgress() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('$_progressKey:index', _currentIndex);
    await prefs.setStringList('$_progressKey:completed', _completed.map((e) => '$e').toList());
  }

  Future<void> _completeCurrent() async {
    if (widget.items.isEmpty) return;
    setState(() => _completed.add(_currentIndex));
    await _saveProgress();

    if (_autoNext && _currentIndex < widget.items.length - 1) {
      await _pageController.nextPage(
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOut,
      );
    }
  }

  void _onPageChanged(int index) {
    setState(() => _currentIndex = index);
    _saveProgress();
  }

  Future<void> _finishSession() async {
    await _saveProgress();
    if (!mounted) return;
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('تقبّل الله منك'),
        content: const Text('أحسنت. أعانك الله على ذكره وشكره وحسن عبادته.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('حسنًا')),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final friday = FridaySchedule(widget.prayerTimes);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: 'إعدادات الجلسة',
            icon: const Icon(Icons.tune_rounded),
            onPressed: _showSessionSettings,
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
          children: [
            _ProgressHeader(
              completed: _completed.length,
              total: widget.items.length,
              progress: progress,
            ),
            const SizedBox(height: 14),
            SizedBox(
              height: 345,
              child: PageView.builder(
                controller: _pageController,
                itemCount: widget.items.length,
                onPageChanged: _onPageChanged,
                itemBuilder: (context, index) => _DhikrCard(
                  item: widget.items[index],
                  index: index,
                  total: widget.items.length,
                  completed: _completed.contains(index),
                  onComplete: _completeCurrent,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  tooltip: 'السابق',
                  onPressed: _currentIndex == 0 ? null : () => _pageController.previousPage(duration: const Duration(milliseconds: 220), curve: Curves.easeOut),
                  icon: const Icon(Icons.chevron_right_rounded),
                ),
                Text('${_currentIndex + 1} من ${widget.items.length}'),
                IconButton(
                  tooltip: 'التالي',
                  onPressed: _currentIndex >= widget.items.length - 1 ? null : () => _pageController.nextPage(duration: const Duration(milliseconds: 220), curve: Curves.easeOut),
                  icon: const Icon(Icons.chevron_left_rounded),
                ),
              ],
            ),
            if (isFinished) ...[
              const SizedBox(height: 8),
              FilledButton.icon(
                onPressed: _finishSession,
                icon: const Icon(Icons.check_circle_outline_rounded),
                label: const Text('إنهاء جلسة الورد'),
              ),
            ],
            if (friday.isFriday) ...[
              const SizedBox(height: 22),
              _FridaySection(
                features: friday.features,
                onFeatureTap: widget.onOpenFridayFeature,
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showSessionSettings() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => SwitchListTile.adaptive(
          title: const Text('الانتقال التلقائي للذكر التالي'),
          subtitle: const Text('يمكنك إيقافه إذا أردت القراءة على مهل'),
          value: _autoNext,
          onChanged: (value) {
            setState(() => _autoNext = value);
            setModalState(() {});
          },
        ),
      ),
    );
  }
}

class _ProgressHeader extends StatelessWidget {
  const _ProgressHeader({required this.completed, required this.total, required this.progress});
  final int completed;
  final int total;
  final double progress;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('تقدّم الجلسة', style: TextStyle(fontWeight: FontWeight.w800)),
                Text('$completed من $total', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(value: progress, minHeight: 7),
            ),
          ],
        ),
      ),
    );
  }
}

class _DhikrCard extends StatelessWidget {
  const _DhikrCard({
    required this.item,
    required this.index,
    required this.total,
    required this.completed,
    required this.onComplete,
  });

  final WardItem item;
  final int index;
  final int total;
  final bool completed;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(.45),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('الذكر ${index + 1} من $total', style: Theme.of(context).textTheme.labelMedium),
                if (completed) const Icon(Icons.check_circle_rounded, color: Colors.green),
              ],
            ),
            Text(
              item.text,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 21, height: 2, fontWeight: FontWeight.w600),
            ),
            if (item.reference != null) Text(item.reference!, style: Theme.of(context).textTheme.bodySmall),
            FilledButton.icon(
              onPressed: completed ? null : onComplete,
              icon: Icon(completed ? Icons.check : Icons.done_rounded),
              label: Text(completed ? 'تمّ الذكر' : 'تمّ الذكر'),
            ),
          ],
        ),
      ),
    );
  }
}

class _FridaySection extends StatelessWidget {
  const _FridaySection({required this.features, this.onFeatureTap});
  final List<FridayFeature> features;
  final ValueChanged<FridayFeature>? onFeatureTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('جمعة مباركة', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text('تذكيرات الجمعة تظهر بهدوء دون أن تقطع جلسة الورد.', style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 10),
        ...features.map((feature) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(child: Icon(feature.icon)),
                title: Text(feature.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(feature.subtitle),
                trailing: feature.available ? const Icon(Icons.arrow_back_ios_new_rounded, size: 16) : null,
                onTap: feature.available ? () => onFeatureTap?.call(feature) : null,
              ),
            )),
      ],
    );
  }
}

// -----------------------------------------------------------------------------
// شاشة المهام اليومية
// -----------------------------------------------------------------------------

class DailyTasksScreen extends StatefulWidget {
  const DailyTasksScreen({
    super.key,
    required this.prayerTimes,
    required this.wardItems,
  });

  final PrayerTimes prayerTimes;
  final List<WardItem> wardItems;

  @override
  State<DailyTasksScreen> createState() => _DailyTasksScreenState();
}

class _DailyTasksScreenState extends State<DailyTasksScreen> {
  final Set<String> _completedFridayTasks = <String>{};

  String get _fridayTasksKey {
    final date = widget.prayerTimes.dhuhr;
    return 'friday_tasks_${date.year}-${date.month}-${date.day}';
  }

  @override
  void initState() {
    super.initState();
    _restoreFridayTasks();
  }

  Future<void> _restoreFridayTasks() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getStringList(_fridayTasksKey) ?? <String>[];
    if (!mounted) return;
    setState(() => _completedFridayTasks.addAll(saved));
  }

  void _toggleFridayTask(String id) {
    setState(() {
      if (!_completedFridayTasks.add(id)) _completedFridayTasks.remove(id);
    });
    SharedPreferences.getInstance().then((prefs) {
      prefs.setStringList(_fridayTasksKey, _completedFridayTasks.toList());
    });
  }

  @override
  Widget build(BuildContext context) {
    final friday = FridaySchedule(widget.prayerTimes);
    final isFriday = friday.isFriday;
    final completed = _completedFridayTasks.length;
    final total = 3; // الكهف، صلاة الجمعة، الصلاة على النبي.

    return Scaffold(
      appBar: AppBar(title: const Text('مهام اليوم'), centerTitle: true),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          _DailyTasksSummary(completed: completed, total: total),
          const SizedBox(height: 14),
          Card(
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.auto_awesome_rounded)),
              title: const Text('جلسة الورد', style: TextStyle(fontWeight: FontWeight.w800)),
              subtitle: const Text('ذكر واحد في كل مرة مع حفظ موضع التوقف'),
              trailing: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => WardSessionScreen(
                    title: 'جلسة الورد',
                    items: widget.wardItems,
                    type: WardType.general,
                    prayerTimes: widget.prayerTimes,
                  ),
                ),
              ),
            ),
          ),
          if (isFriday) ...[
            const SizedBox(height: 18),
            _FridayTasksCard(
              schedule: friday,
              completed: _completedFridayTasks,
              onToggle: _toggleFridayTask,
            ),
          ],
        ],
      ),
    );
  }
}

class _DailyTasksSummary extends StatelessWidget {
  const _DailyTasksSummary({required this.completed, required this.total});
  final int completed;
  final int total;

  @override
  Widget build(BuildContext context) {
    final progress = total == 0 ? 0.0 : completed / total;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('ملخص اليوم', style: TextStyle(fontWeight: FontWeight.w800)),
              Text('$completed من $total', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700)),
            ]),
            const SizedBox(height: 10),
            ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(value: progress, minHeight: 7)),
          ],
        ),
      ),
    );
  }
}

class _FridayTasksCard extends StatelessWidget {
  const _FridayTasksCard({required this.schedule, required this.completed, required this.onToggle});
  final FridaySchedule schedule;
  final Set<String> completed;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    final rows = [
      ('kahf', 'قراءة سورة الكهف', 'يمكن قراءتها في أي وقت من يوم الجمعة', Icons.menu_book_rounded),
      ('prayer', 'صلاة الجمعة', 'تذكير بموعد الصلاة بحسب توقيت المسجد', Icons.mosque_rounded),
      ('salawat', 'الصلاة على النبي ﷺ', 'من مغرب الخميس إلى مغرب الجمعة', Icons.favorite_rounded),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4),
              child: Text('مهام الجمعة', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(4, 4, 4, 8),
              child: Text('سورة الكهف، صلاة الجمعة، ساعة الإجابة، والصلاة على النبي ﷺ.'),
            ),
            ...rows.map((row) {
              final done = completed.contains(row.$1);
              return CheckboxListTile(
                value: done,
                onChanged: (_) => onToggle(row.$1),
                secondary: Icon(row.$4),
                title: Text(row.$2, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(row.$3),
                controlAffinity: ListTileControlAffinity.leading,
              );
            }),
            ListTile(
              leading: Icon(Icons.hourglass_bottom_rounded, color: schedule.isHourOfResponse ? Colors.amber.shade800 : null),
              title: const Text('ساعة الإجابة', style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(schedule.isHourOfResponse ? 'الوقت الآن: أكثر من الدعاء حتى المغرب' : 'من بعد العصر إلى المغرب'),
            ),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// الإشعارات
// -----------------------------------------------------------------------------

class WardNotificationService {
  WardNotificationService._();
  static final instance = WardNotificationService._();

  final FlutterLocalNotificationsPlugin plugin = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    );
    await plugin.initialize(settings);
  }

  Future<void> scheduleDailyWardReminders({required tz.Location location}) async {
    await _scheduleAt(
      id: 100,
      title: 'وقفة هادئة',
      body: 'حان وقت أذكار الصباح.',
      time: _nextTime(5, 30, location),
    );
    await _scheduleAt(
      id: 101,
      title: 'أذكار المساء',
      body: 'خذ دقائقك مع أذكار المساء.',
      time: _nextTime(15, 30, location),
    );
    await _scheduleAt(
      id: 102,
      title: 'أذكار النوم',
      body: 'اختم يومك بذكر الله بهدوء.',
      time: _nextTime(20, 0, location),
    );
  }

  Future<void> scheduleFridayReminders({required PrayerTimes prayerTimes, bool startSalawatAtFridayMaghrib = false}) async {
    if (prayerTimes.dhuhr.weekday != DateTime.friday) return;
    final schedule = FridaySchedule(prayerTimes, salawatStartsAtFridayMaghrib: startSalawatAtFridayMaghrib);
    await _scheduleAt(id: 200, title: 'سورة الكهف', body: 'لا تنس قراءة سورة الكهف اليوم.', time: _asTz(prayerTimes.fajr));
    await _scheduleAt(id: 201, title: 'صلاة الجمعة', body: 'استعد لصلاة الجمعة.', time: _asTz(prayerTimes.fridayPrayer.subtract(const Duration(minutes: 45))));
    await _scheduleAt(id: 202, title: 'ساعة الإجابة', body: 'من بعد العصر إلى المغرب: أكثر من الدعاء.', time: _asTz(prayerTimes.asr));
    await _scheduleAt(id: 203, title: 'الصلاة على النبي ﷺ', body: 'أكثر من الصلاة على النبي خلال فترة الجمعة.', time: _asTz(schedule.salawatStart));
    assert(schedule.features.isNotEmpty);
  }

  Future<void> _scheduleAt({required int id, required String title, required String body, required tz.TZDateTime time}) async {
    await plugin.zonedSchedule(
      id,
      title,
      body,
      time,
      const NotificationDetails(
        android: AndroidNotificationDetails('ward_channel', 'الورد اليومي', channelDescription: 'تذكيرات الورد ومزايا الجمعة', importance: Importance.defaultImportance),
        iOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  tz.TZDateTime _nextTime(int hour, int minute, tz.Location location) {
    final now = tz.TZDateTime.now(location);
    var target = tz.TZDateTime(location, now.year, now.month, now.day, hour, minute);
    if (!target.isAfter(now)) target = target.add(const Duration(days: 1));
    return target;
  }

  tz.TZDateTime _asTz(DateTime value) => tz.TZDateTime.from(value, tz.local);
}
