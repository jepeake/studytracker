"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  BarChart2,
  Moon,
  Sun,
  Plus,
  X,
  PieChartIcon,
  BarChartIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type WorkType = string;

type StudySession = {
  date: string;
  duration: number; // Duration in minutes
  workType: WorkType;
};

const githubBlues = [
  "#0366d6",
  "#2188ff",
  "#79b8ff",
  "#c8e1ff",
  "#0a5ae1",
  "#044289",
  "#032f62",
  "#05264c",
];

export function FlowAppComponent() {
  const [time, setTime] = useState(60 * 60); // Remaining time in seconds
  const [isActive, setIsActive] = useState(false);
  const [inputTime, setInputTime] = useState("60"); // User input in minutes
  const [studyHistory, setStudyHistory] = useState<StudySession[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM"),
  );
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType>("");
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [newWorkType, setNewWorkType] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [pausedTime, setPausedTime] = useState<number | null>(null);

  const [elapsedTime, setElapsedTime] = useState(0); // Cumulative elapsed time in seconds

  const [year, month] = selectedMonth.split("-");

  // 1. Generate empty cells for padding before the first day of the month
  const firstDayOfMonth = startOfMonth(
    new Date(parseInt(year), parseInt(month) - 1),
  );
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sunday) to 6 (Saturday)
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => (
    <div key={`empty-${i}`} className="text-center p-2 rounded-md bg-transparent"></div>
  ));

  // 2. Load and Save Study History and Settings from LocalStorage
  useEffect(() => {
    const storedHistory = localStorage.getItem("studyHistory");
    const storedWorkTypes = localStorage.getItem("workTypes");
    const storedDarkMode = localStorage.getItem("darkMode");
    if (storedHistory) setStudyHistory(JSON.parse(storedHistory));
    if (storedWorkTypes) setWorkTypes(JSON.parse(storedWorkTypes));
    if (storedDarkMode !== null) setIsDarkMode(JSON.parse(storedDarkMode));
  }, []);

  useEffect(() => {
    localStorage.setItem("workTypes", JSON.stringify(workTypes));
  }, [workTypes]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // 3. Handle Timer Logic with Cumulative Elapsed Time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
        setElapsedTime((prevElapsed) => prevElapsed + 1);
      }, 1000);
    } else if (time === 0) {
      setIsActive(false);
      if (elapsedTime > 0) {
        const actualDuration = Math.round(elapsedTime / 60); // Convert to minutes
        const newSession: StudySession = {
          date: new Date().toISOString(),
          duration: actualDuration,
          workType: selectedWorkType,
        };
        setStudyHistory((prevHistory) => {
          const updatedHistory = [...prevHistory, newSession];
          localStorage.setItem("studyHistory", JSON.stringify(updatedHistory));
          return updatedHistory;
        });
      }
      setElapsedTime(0); // Reset elapsed time for the next session
      setPausedTime(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, time, elapsedTime, selectedWorkType]);

  const toggleTimer = useCallback(() => {
    if (!isActive) {
      if (pausedTime) {
        setTime(pausedTime);
        setPausedTime(null);
      } else {
        setTime(parseInt(inputTime, 10) * 60);
      }
      setIsActive(true);
    } else {
      setPausedTime(time);
      setIsActive(false);
    }
  }, [isActive, inputTime, time, pausedTime]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTime(parseInt(inputTime, 10) * 60);
    setElapsedTime(0); // Reset elapsed time
    setPausedTime(null);
  }, [inputTime]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // 4. Chart Data Calculation
  const getChartData = useCallback(() => {
    const [year, month] = selectedMonth.split("-");
    const startDate = startOfMonth(
      new Date(parseInt(year), parseInt(month) - 1),
    );
    const endDate = endOfMonth(startDate);
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

    return daysInMonth.map((day) => {
      const sessionsForDay = studyHistory.filter((session) =>
        isSameDay(new Date(session.date), day),
      );
      const durations = workTypes.reduce(
        (acc, workType) => {
          acc[workType] =
            sessionsForDay
              .filter((session) => session.workType === workType)
              .reduce((sum, session) => sum + session.duration, 0) / 60; // Convert to hours
          return acc;
        },
        {} as Record<WorkType, number>,
      );

      return {
        date: format(day, "dd"),
        ...durations,
        total: Object.values(durations).reduce(
          (sum, duration) => sum + duration,
          0,
        ),
      };
    });
  }, [selectedMonth, studyHistory, workTypes]);

  const chartData = useMemo(() => getChartData(), [getChartData]);

  // 5. Add New Work Type Logic
  const addWorkType = useCallback(() => {
    if (newWorkType && !workTypes.includes(newWorkType)) {
      setWorkTypes((prev) => [...prev, newWorkType]);
      setNewWorkType("");
    }
  }, [newWorkType, workTypes]);

  // 6. Remove Work Type
  const removeWorkType = useCallback((typeToRemove: WorkType) => {
    setWorkTypes((prev) => prev.filter((type) => type !== typeToRemove));
  }, []);

  // 7. Work Breakdown Calculation (For Pie Chart)
  const getWorkBreakdown = useCallback(() => {
    const today = new Date();
    const startDate = startOfMonth(today);
    const endDate = endOfMonth(today);

    const relevantSessions = studyHistory.filter((session) => {
      const sessionDate = new Date(session.date);
      return sessionDate >= startDate && sessionDate <= endDate;
    });

    return workTypes
      .map((workType) => ({
        name: workType,
        value:
          relevantSessions
            .filter((session) => session.workType === workType)
            .reduce((sum, session) => sum + session.duration, 0) / 60, // Convert to hours
      }))
      .filter((item) => item.value > 0);
  }, [studyHistory, workTypes]);

  const workBreakdown = useMemo(() => getWorkBreakdown(), [getWorkBreakdown]);

  // 8. Calculate Total Time Worked
  const totalTimeWorked = useMemo(() => {
    return workBreakdown.reduce((total, item) => total + item.value, 0);
  }, [workBreakdown]);

  // 9. Calculate Average Time Per Day
  const averageTimePerDay = useMemo(() => {
    if (studyHistory.length === 0) return 0;

    // Calculate unique days with study sessions
    const uniqueStudyDays = new Set(
      studyHistory.map((session) => new Date(session.date).toDateString())
    );

    // Total study time in hours
    const totalHours = studyHistory.reduce(
      (sum, session) => sum + session.duration / 60,
      0
    );

    // Return average hours per unique study day
    return totalHours / uniqueStudyDays.size;
  }, [studyHistory]);

  // 10. Handle Month Change
  const handleMonthChange = useCallback((value: string) => {
    setSelectedMonth(value);
  }, []);

  const handlePrevMonth = useCallback(() => {
    setSelectedMonth(format(subMonths(new Date(selectedMonth), 1), "yyyy-MM"));
  }, [selectedMonth]);

  const handleNextMonth = useCallback(() => {
    setSelectedMonth(format(addMonths(new Date(selectedMonth), 1), "yyyy-MM"));
  }, [selectedMonth]);

  // 11. Return the full UI
  const currentDate = new Date();
  const currentMonth = format(currentDate, "yyyy-MM");

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark" : ""}`}>
      <div className="min-h-screen bg-white text-gray-900 dark:bg-[#0d1117] dark:text-white transition-colors duration-200">
        <main className="container mx-auto p-4">
          <div className="flex justify-end items-center mb-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
              />
              <Label htmlFor="dark-mode">
                {isDarkMode ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timer Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-md shadow-sm h-full">
                <CardHeader className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <Clock className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </CardHeader>
                <CardContent className="p-4 flex flex-col justify-between h-[calc(100%-60px)]">
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-6xl font-light tracking-tight" aria-live="polite">
                      {formatTime(time)}
                    </div>
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="flex items-center justify-center gap-2 w-full">
                        <Input
                          type="number"
                          value={inputTime}
                          onChange={(e) => setInputTime(e.target.value)}
                          placeholder="Minutes"
                          className="w-24 text-center text-base font-normal border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-[#0d1117] dark:text-white"
                          min="1"
                          aria-label="Set timer duration in minutes"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-normal">minutes</span>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between bg-white dark:bg-[#21262d] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#30363d]"
                          >
                            {selectedWorkType || "Select Work Type"}
                            <ChevronRight className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-white dark:bg-[#161b22]">
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none text-gray-900 dark:text-white">Work Types</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Select or manage your work types.</p>
                            </div>
                            <div className="grid gap-2">
                              {workTypes.map((type) => (
                                <div key={type} className="flex items-center justify-between">
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#30363d]"
                                    onClick={() => setSelectedWorkType(type)}
                                  >
                                    {type}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeWorkType(type)}
                                    className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="New work type"
                                value={newWorkType}
                                onChange={(e) => setNewWorkType(e.target.value)}
                                className="flex-1 bg-white dark:bg-[#0d1117] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                              />
                              <Button onClick={addWorkType} className="bg-green-600 hover:bg-green-700 text-white">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        onClick={toggleTimer}
                        className={`w-full py-2 text-base font-medium rounded-md transition-colors duration-200 ${
                          isActive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {isActive ? "Pause" : "Start"}
                      </Button>
                      <Button
                        onClick={resetTimer}
                        variant="outline"
                        className="w-full py-2 text-base font-medium rounded-md border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#30363d] transition-colors duration-200"
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Calendar and Charts */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <Card className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
                <CardHeader className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <Calendar className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <Button
                      onClick={handlePrevMonth}
                      variant="outline"
                      className="p-2 bg-white dark:bg-[#21262d] border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#30363d]"
                      disabled={
                        selectedMonth ===
                        format(new Date(currentDate.getFullYear(), 0), "yyyy-MM")
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Select value={selectedMonth} onValueChange={handleMonthChange}>
                      <SelectTrigger className="w-[180px] bg-white dark:bg-[#21262d] border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700">
                        {Array.from(
                          { length: currentDate.getMonth() + 1 },
                          (_, i) => {
                            const date = new Date(currentDate.getFullYear(), i, 1);
                            return (
                              <SelectItem key={i} value={format(date, "yyyy-MM")} className="text-gray-700 dark:text-gray-300">
                                {format(date, "MMMM yyyy")}
                              </SelectItem>
                            );
                          },
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleNextMonth}
                      variant="outline"
                      className="p-2 bg-white dark:bg-[#21262d] border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#30363d]"
                      disabled={selectedMonth === currentMonth}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center font-medium text-gray-500 dark:text-gray-400">
                        {day}
                      </div>
                    ))}

                    {/* Add padding for the empty days before the first day of the month */}
                    {paddingDays}

                    {/* Render actual days of the month */}
                    {chartData.map((day, index) => {
                      const [year, month] = selectedMonth.split("-");
                      const currentDay = new Date(
                        parseInt(year),
                        parseInt(month) - 1,
                        parseInt(day.date),
                      );
                      const isCurrentDay = isToday(currentDay);
                      const hasActivity = day.total > 0;

                      return (
                        <div
                          key={index}
                          className={`text-center p-2 rounded-md ${
                            isCurrentDay
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100"
                              : hasActivity
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <div className="font-medium">{day.date}</div>
                          {hasActivity && (
                            <div className="text-xs mt-1 font-light">
                              {day.total.toFixed(1)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total:{" "}
                      {chartData
                        .reduce((sum, day) => sum + day.total, 0)
                        .toFixed(2)}{" "}
                      hours
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="md:col-span-2">
              <Card className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
                <CardHeader className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <BarChart2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                        <XAxis
                          dataKey="date"
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={50}
                          tick={{
                            fontSize: 12,
                            fill: isDarkMode ? "#8b949e" : "#57606a",
                          }}
                        />
                        <YAxis
                          tick={{ fill: isDarkMode ? "#8b949e" : "#57606a" }}
                          label={{
                            value: "Hours",
                            angle: -90,
                            position: "insideLeft",
                            fill: isDarkMode ? "#8b949e" : "#57606a",
                            dx: -10,
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDarkMode ? "#161b22" : "#ffffff",
                            border: "1px solid",
                            borderColor: isDarkMode ? "#30363d" : "#d0d7de",
                            borderRadius: "6px",
                          }}
                          formatter={(value: number, name: string) => [`${name}: ${value.toFixed(2)}`, "No. of Hours"]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        {workTypes.map((type, index) => (
                          <Bar
                            key={type}
                            dataKey={type}
                            stackId="a"
                            fill={githubBlues[index % githubBlues.length]}
                            opacity={isDarkMode ? 0.8 : 1}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pie Chart and Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="md:col-span-1">
              <Card className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-md shadow-sm h-full">
                <CardHeader className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <PieChartIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={workBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {workBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={githubBlues[index % githubBlues.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [value.toFixed(2), "Hours"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Summary Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }} className="md:col-span-1">
              <Card className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-700 rounded-md shadow-sm h-full">
                <CardHeader className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <BarChartIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Time</h4>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalTimeWorked.toFixed(2)} hours</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Time Per Day</h4>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageTimePerDay.toFixed(2)} hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
