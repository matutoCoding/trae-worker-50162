export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/equipment/index',
    'pages/order/index',
    'pages/config/index',
    'pages/equipment-detail/index',
    'pages/order-detail/index',
    'pages/add-equipment/index',
    'pages/rate-edit/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2563EB',
    navigationBarTitleText: '设备租赁站',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F8FAFC'
  },
  tabBar: {
    color: '#64748B',
    selectedColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/equipment/index',
        text: '设备管理'
      },
      {
        pagePath: 'pages/order/index',
        text: '租赁订单'
      },
      {
        pagePath: 'pages/config/index',
        text: '计费配置'
      }
    ]
  }
})
