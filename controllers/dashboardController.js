import Lead from "../models/Lead.js";
import User from "../models/User.js";
import Followup from "../models/Followup.js";
import Call from "../models/Call.js";

// @desc    Get comprehensive CRM Dashboard statistics & charts
// @route   GET /api/dashboard/stats
export const getDashboardStats = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const wonLeads = await Lead.find({ status: "Won" });
    const totalSales = wonLeads.reduce((acc, lead) => acc + (lead.saleAmount || 0), 0);
    const totalConversions = wonLeads.length;
    const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0;
    const pendingFollowups = await Followup.countDocuments({ completed: false });
    const totalCalls = await Call.countDocuments();

    // Source breakdown
    const leadsBySource = await Lead.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Status breakdown
    const leadsByStatus = await Lead.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Top performers
    const topPerformers = await User.find({ status: "Active" })
      .select("-password")
      .sort("-sales")
      .limit(5);

    // Chart data for monthly sales
    const chartData = [
      { day: "1 Sep", sales: 8, target: 10 },
      { day: "5 Sep", sales: 12, target: 13 },
      { day: "10 Sep", sales: 10, target: 16 },
      { day: "15 Sep", sales: 21, target: 20 },
      { day: "20 Sep", sales: 18, target: 24 },
      { day: "25 Sep", sales: 29, target: 28 },
      { day: "28 Sep", sales: 33, target: 32 },
      { day: "30 Sep", sales: 38, target: 40 },
    ];

    res.json({
      success: true,
      data: {
        totalLeads,
        totalSales,
        totalConversions,
        conversionRate,
        pendingFollowups,
        totalCalls,
        leadsBySource,
        leadsByStatus,
        topPerformers,
        chartData,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
