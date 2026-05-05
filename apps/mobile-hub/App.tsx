import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { HubAction, HubPlannedObject, HubThreadSummary } from "@local-effort/shared";
import {
  calendarFixture,
  inboxFixture,
  spacesFixture,
  threadMessagesFixture,
  todayFixture,
} from "./src/data/hubFixtures";

type TabKey = "today" | "calendar" | "spaces" | "inbox";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "calendar", label: "Calendar" },
  { key: "spaces", label: "Spaces" },
  { key: "inbox", label: "Inbox" },
];

function formatTime(value?: string | null) {
  if (!value) return "Any time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Any time";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function Pill({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "urgent" | "done" }) {
  return <Text style={[styles.pill, styles[`pill_${tone}`]]}>{children}</Text>;
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

function ActionCard({ action }: { action: HubAction }) {
  const tone = action.status === "done" ? "done" : action.source.includes("feedback") ? "neutral" : "urgent";
  return (
    <Pressable style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle}>{action.title}</Text>
        <Pill tone={tone}>{action.status.replace("_", " ")}</Pill>
      </View>
      <Text style={styles.rowSub}>
        {action.source.replaceAll("_", " ")} · {formatTime(action.dueAt)}
      </Text>
    </Pressable>
  );
}

function ObjectCard({ object }: { object: HubPlannedObject }) {
  const statusTone = object.scheduleStatus === "checked_in" ? "done" : "neutral";
  return (
    <Pressable style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle}>{object.title}</Text>
        <Pill tone={statusTone}>{object.horizon}</Pill>
      </View>
      <Text style={styles.rowSub}>
        {object.subtitle || object.type.replace("_", " ")} · {formatTime(object.startsAt)}
      </Text>
    </Pressable>
  );
}

function ThreadCard({ thread }: { thread: HubThreadSummary }) {
  return (
    <Pressable style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle}>{thread.title}</Text>
        {thread.unreadCount ? <Pill tone="urgent">{String(thread.unreadCount)}</Pill> : <Pill>read</Pill>}
      </View>
      <Text style={styles.rowSub}>{thread.preview || "No recent message"}</Text>
    </Pressable>
  );
}

function TodayScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{todayFixture.summary.dueActionCount}</Text>
          <Text style={styles.summaryLabel}>Open actions</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{todayFixture.summary.unreadThreadCount}</Text>
          <Text style={styles.summaryLabel}>Unread</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{todayFixture.summary.inboxCount}</Text>
          <Text style={styles.summaryLabel}>Inbox</Text>
        </View>
      </View>

      <SectionHeader title="Now" meta={`${todayFixture.objects.length} objects`} />
      {todayFixture.objects.map((object) => <ObjectCard key={object.id} object={object} />)}

      <SectionHeader title="Actions" meta={`${todayFixture.actions.length} due`} />
      {todayFixture.actions.map((action) => <ActionCard key={action.id} action={action} />)}

      <SectionHeader title="Threads" meta="latest" />
      {todayFixture.threads.map((thread) => <ThreadCard key={thread.id} thread={thread} />)}
    </ScrollView>
  );
}

function CalendarScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <SectionHeader
        title="Week"
        meta={`${calendarFixture.range.start} to ${calendarFixture.range.end}`}
      />
      {calendarFixture.objects.map((object) => <ObjectCard key={object.id} object={object} />)}
    </ScrollView>
  );
}

function SpacesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <SectionHeader title="Spaces" meta={`${spacesFixture.spaces.length} visible`} />
      {spacesFixture.spaces.map((space) => (
        <Pressable key={space.id} style={styles.rowCard}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle}>{space.title}</Text>
            <Pill>{space.role}</Pill>
          </View>
          <Text style={styles.rowSub}>
            {space.visibility} · {space.objectCount} objects · {space.unreadCount} unread
          </Text>
        </Pressable>
      ))}
      <SectionHeader title="Selected Thread" meta={threadMessagesFixture.messages.length.toString()} />
      {threadMessagesFixture.messages.map((message) => (
        <View key={message.id} style={styles.messageBubble}>
          <Text style={styles.messageRole}>{message.senderRole || "member"}</Text>
          <Text style={styles.messageBody}>{message.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function InboxScreen() {
  const [capture, setCapture] = useState("");
  const captureHint = useMemo(() => {
    if (!capture.trim()) return "Quick capture routes notes, tasks, vendors, check-ins, and feedback.";
    if (capture.toLowerCase().includes("check")) return "Suggested intent: checkin";
    if (capture.toLowerCase().includes("rate")) return "Suggested intent: feedback";
    return "Suggested intent: note";
  }, [capture]);

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.capturePanel}>
        <Text style={styles.captureTitle}>Capture</Text>
        <TextInput
          value={capture}
          onChangeText={setCapture}
          multiline
          placeholder="Add a note, schedule change, task, vendor, or check-in"
          placeholderTextColor="#7c8798"
          style={styles.captureInput}
        />
        <View style={styles.captureFooter}>
          <Text style={styles.captureHint}>{captureHint}</Text>
          <Pressable style={styles.captureButton}>
            <Text style={styles.captureButtonText}>Queue</Text>
          </Pressable>
        </View>
      </View>

      <SectionHeader title="Inbox" meta={`${inboxFixture.items.length} items`} />
      {inboxFixture.items.map((item) => (
        <Pressable key={item.id} style={styles.rowCard}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Pill tone={item.status === "pending" ? "urgent" : "neutral"}>{item.status}</Pill>
          </View>
          <Text style={styles.rowSub}>{item.preview}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ActiveScreen({ tab }: { tab: TabKey }) {
  if (tab === "calendar") return <CalendarScreen />;
  if (tab === "spaces") return <SpacesScreen />;
  if (tab === "inbox") return <InboxScreen />;
  return <TodayScreen />;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("today");

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Local Effort Hub</Text>
          <Text style={styles.title}>Today</Text>
        </View>
        <View style={styles.profileDot}>
          <Text style={styles.profileInitial}>W</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <FlatList
          data={tabs}
          horizontal
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setActiveTab(item.key)}
              style={[styles.tab, activeTab === item.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      <ActiveScreen tab={activeTab} />
    </SafeAreaView>
  );
}

const colors = {
  ink: "#172033",
  muted: "#627084",
  line: "#d9e0e8",
  panel: "#ffffff",
  bg: "#eef2f5",
  green: "#206a4b",
  red: "#a33a32",
  blue: "#245b8f",
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 2,
  },
  profileDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 17,
  },
  tabBar: {
    paddingLeft: 20,
    paddingBottom: 8,
  },
  tab: {
    minWidth: 92,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  tabText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  screenContent: {
    padding: 20,
    paddingBottom: 44,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  summaryTile: {
    flex: 1,
    minHeight: 86,
    borderRadius: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    justifyContent: "space-between",
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  rowCard: {
    borderRadius: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  rowTop: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  rowTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
  rowSub: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  pill: {
    minWidth: 48,
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: colors.blue,
    backgroundColor: "#e7f0f8",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  pill_neutral: {
    color: colors.blue,
    backgroundColor: "#e7f0f8",
  },
  pill_urgent: {
    color: colors.red,
    backgroundColor: "#f8e9e7",
  },
  pill_done: {
    color: colors.green,
    backgroundColor: "#e5f2eb",
  },
  messageBubble: {
    alignSelf: "stretch",
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  messageRole: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  messageBody: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  capturePanel: {
    borderRadius: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 20,
  },
  captureTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
  captureInput: {
    minHeight: 92,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    padding: 12,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: "top",
    backgroundColor: "#f9fafb",
  },
  captureFooter: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  captureHint: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  captureButton: {
    minWidth: 78,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  captureButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
