import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file received.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure safe filename
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const filePath = join(process.cwd(), 'public/uploads', filename);

    // Write file to public/uploads
    await writeFile(filePath, buffer);

    // Return the local URL
    return NextResponse.json({
      success: true,
      url: `/uploads/${filename}`
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file.' },
      { status: 500 }
    );
  }
}
