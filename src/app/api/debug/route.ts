import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  console.log('🟢 DEBUG API - GET called successfully');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('⚡ Vercel Region:', process.env.VERCEL_REGION);
  
  return NextResponse.json({ 
    status: 'success',
    message: 'Debug API is working!',
    timestamp: new Date().toISOString(),
    method: 'GET'
  });
}

export async function POST(request: NextRequest) {
  console.log('🟡 DEBUG API - POST called');
  console.log('📅 Timestamp:', new Date().toISOString());
  
  try {
    console.log('📦 Trying to read request body...');
    const contentType = request.headers.get('content-type');
    console.log('📝 Content-Type:', contentType);
    
    let body = null;
    if (contentType?.includes('application/json')) {
      body = await request.json();
      console.log('✅ JSON body parsed:', body);
    } else if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      console.log('✅ Form data parsed');
      const file = formData.get('image') as File;
      console.log('📁 File info:', file ? {
        name: file.name,
        size: file.size,
        type: file.type
      } : 'No file');
      body = { hasFile: !!file, fileName: file?.name };
    } else {
      console.log('ℹ️ No body to parse');
    }
    
    console.log('✅ DEBUG API - POST completed successfully');
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Debug API POST is working!',
      timestamp: new Date().toISOString(),
      method: 'POST',
      receivedData: body
    });
    
  } catch (error) {
    console.error('❌ DEBUG API - POST error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Debug API POST failed',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}