export default function AnalyticsFooter({ connected }) {
  return <footer className="analytics-footer"><span>{connected ? 'Data source: Vision Shield backend API' : 'Data source: backend unavailable'}</span><span>Refresh interval: 15 seconds · Event views use the latest 200 records</span></footer>
}
