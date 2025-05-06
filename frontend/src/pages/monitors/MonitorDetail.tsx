import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Card,
  Grid,
  Badge,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  Pencil1Icon,
  TrashIcon,
  ReloadIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import * as Toast from "@radix-ui/react-toast";
import {
  getMonitor,
  deleteMonitor,
  checkMonitor,
  getMonitorStatusHistoryById,
  getMonitorDailyStats,
} from "../../api/monitors";
import { MonitorWithDailyStatsAndStatusHistory } from "../../types/monitors";
import { useTranslation } from "react-i18next";
import ResponseTimeChart from "../../components/ResponseTimeChart";
import StatusBar from "../../components/StatusBar";

// 将范围状态码转换为可读形式（2 -> 2xx, 3 -> 3xx 等）
const formatStatusCode = (code: number | undefined): string => {
  if (code === undefined) return "200";

  // 对于1-5这些值，显示为1xx、2xx、3xx等
  if (code >= 1 && code <= 5) {
    return `${code}xx`;
  }
  // 其他正常显示数字
  return code.toString();
};

const MonitorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [monitor, setMonitor] =
    useState<MonitorWithDailyStatsAndStatusHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const { t } = useTranslation();

  // 组件加载时获取数据
  useEffect(() => {
    fetchMonitorData();

    // 设置定时器，每分钟刷新一次数据
    const intervalId = setInterval(() => {
      console.log("MonitorDetail: 自动刷新数据...");
      fetchMonitorData();
    }, 60000); // 60000ms = 1分钟

    // 组件卸载时清除定时器
    return () => clearInterval(intervalId);
  }, [id]);

  // 获取监控详情数据
  const fetchMonitorData = async () => {
    if (!id) return;
    setLoading(true);
    let monitorData: MonitorWithDailyStatsAndStatusHistory | null = null;
    const monitor = await getMonitor(parseInt(id));
    const history = await getMonitorStatusHistoryById(parseInt(id));
    const dailyStats = await getMonitorDailyStats(parseInt(id));

    console.log("dailyStats: ", dailyStats);
    console.log("history: ", history);
    console.log("monitor: ", monitor);

    if (monitor.success && monitor.monitor) {
      monitorData = {
        ...monitor.monitor,
        history: history.history || [],
        dailyStats: dailyStats.dailyStats || [],
      };
    }
    if (monitorData) {
      setMonitor(monitorData);
    } else {
      setError(t("common.error.fetch"));
    }
    setLoading(false);
  };

  // 手动检查监控状态
  const handleCheck = async () => {
    if (!id) return;
    setLoading(true);
    const response = await checkMonitor(parseInt(id));
    if (response.success) {
      setToastMessage(t("monitor.checkCompleted"));
      setToastType("success");
      setToastOpen(true);
    } else {
      setToastMessage(t("monitor.checkFailed"));
      setToastType("error");
      setToastOpen(true);
    }
    setLoading(false);
  };

  // 删除监控
  const handleDelete = async () => {
    if (!id || !window.confirm(t("monitors.delete.confirm"))) return;

    const response = await deleteMonitor(parseInt(id));
    if (response.success) {
      setToastMessage(t("monitor.deleteSuccess"));
      setToastType("success");
      setToastOpen(true);

      // 短暂延迟后导航，让用户有时间看到提示
      setTimeout(() => {
        navigate("/monitors");
      }, 1500);
    } else {
      setToastMessage(t("monitor.deleteFailed"));
      setToastType("error");
      setToastOpen(true);
    }
  };

  // 状态颜色映射
  const statusColors: { [key: string]: "green" | "red" | "gray" } = {
    up: "green",
    down: "red",
    pending: "gray",
  };

  // 加载中显示
  if (loading) {
    return (
      <Box className="monitor-detail" p="4">
        <Text>{t("common.loading")}</Text>
      </Box>
    );
  }

  // 错误显示
  if (error || !monitor) {
    return (
      <Box className="monitor-detail" p="4">
        <Text style={{ color: "var(--red-9)" }}>
          {error || t("monitor.notExist")}
        </Text>
        <Button variant="soft" onClick={() => navigate("/monitors")} mt="2">
          {t("monitor.returnToList")}
        </Button>
      </Box>
    );
  }

  return (
    <Box className="monitor-detail" p="4">
      <div>
        <Flex justify="between" align="center" className="detail-header">
          <Flex align="center" gap="2">
            <Button
              variant="soft"
              size="1"
              onClick={() => navigate("/monitors")}
            >
              <ArrowLeftIcon />
            </Button>
            <Heading size="6">{monitor.name}</Heading>
            <Badge color={statusColors[monitor.status]}>
              {monitor.status === "up"
                ? t("monitor.status.normal")
                : monitor.status === "down"
                ? t("monitor.status.failure")
                : t("monitor.status.pending")}
            </Badge>
          </Flex>
          <Flex gap="2">
            <Button variant="soft" onClick={handleCheck}>
              <ReloadIcon />
              {t("monitor.manualCheck")}
            </Button>
            <Button
              variant="soft"
              onClick={() => navigate(`/monitors/edit/${id}`)}
            >
              <Pencil1Icon />
              {t("monitor.edit")}
            </Button>
            <Button variant="soft" color="red" onClick={handleDelete}>
              <TrashIcon />
              {t("monitor.delete")}
            </Button>
          </Flex>
        </Flex>
        <Box pt="4" className="detail-content">
          <Card>
            <Flex direction="column" gap="3">
              <Heading size="4">{t("monitor.detailInfo")}</Heading>
              <Grid columns="2" gap="3">
                <Text>URL:</Text>
                <Text>{monitor.url}</Text>
                <Text>{t("monitor.method")}:</Text>
                <Text>{monitor.method}</Text>
                <Text>{t("monitor.interval")}:</Text>
                <Text>
                  {monitor.interval} {t("common.seconds")}
                </Text>
                <Text>{t("monitor.timeout")}:</Text>
                <Text>
                  {monitor.timeout} {t("common.seconds")}
                </Text>
                <Text>{t("monitor.expectedStatus")}:</Text>
                <Text>{formatStatusCode(monitor.expected_status)}</Text>
                <Text>{t("monitor.createTime")}:</Text>
                <Text>{new Date(monitor.created_at).toLocaleString()}</Text>
                <Text>{t("monitor.headers")}:</Text>
                <Text style={{ overflowWrap: "break-word" }}>
                  {typeof monitor.headers === "string"
                    ? monitor.headers
                    : JSON.stringify(monitor.headers)}
                </Text>
                <Text>{t("monitor.body")}:</Text>
                <Text style={{ overflowWrap: "break-word" }}>
                  {monitor.body || "-"}
                </Text>
              </Grid>
            </Flex>
          </Card>
          {/* 添加响应时间图表 */}
          <Card mt="4">
            <Flex direction="column" gap="3" mt="4">
              <Heading size="4">{t("monitor.oneDayHistory")}</Heading>
              <Box>
                <ResponseTimeChart
                  history={monitor.history || []}
                  height={220}
                />
              </Box>
            </Flex>
          </Card>
          <Card mt="4">
            <Flex direction="column" gap="3">
              <Heading size="4">{t("monitor.MonthsHistory")}</Heading>
              <Box>
                <StatusBar dailyStats={monitor.dailyStats || []} />
              </Box>
            </Flex>
          </Card>
        </Box>
        <Toast.Provider swipeDirection="right">
          <Toast.Root
            className="ToastRoot"
            open={toastOpen}
            onOpenChange={setToastOpen}
            duration={3000}
            style={{
              backgroundColor:
                toastType === "success" ? "var(--green-9)" : "var(--red-9)",
              borderRadius: "8px",
              zIndex: 9999,
            }}
          >
            <Toast.Title className="ToastTitle">
              {toastType === "success"
                ? t("common.success")
                : t("common.error")}
            </Toast.Title>
            <Toast.Description className="ToastDescription">
              {toastMessage}
            </Toast.Description>
            <Toast.Close className="ToastClose">
              <Cross2Icon />
            </Toast.Close>
          </Toast.Root>
          <Toast.Viewport className="ToastViewport" />
        </Toast.Provider>
      </div>
    </Box>
  );
};

export default MonitorDetail;
