import { HomeOutlined } from '@ant-design/icons'
import { Button, Result } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './index.css'

export const PageNotFound = () => {
  const { t } = useTranslation()

  const navigate = useNavigate()
  const handleGoHome = () => {
    navigate('/dashboard')
  }

  return (
    <div className="not-found">
      <Result
        status="404"
        title="404"
        subTitle={t('content.page_not_found')}
        extra={
          <Button type="primary" icon={<HomeOutlined />} size="large" onClick={handleGoHome}>
            {t('content.return_to_safety')}
          </Button>
        }
      />
    </div>
  )
}
