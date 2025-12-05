import { v2 as cloudinary } from 'cloudinary';
import { Event } from '@/database';
import connectToDatabase from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await req.formData();

    let event;

    try {
      event = Object.fromEntries(formData.entries());
    } catch (e) {
      return NextResponse.json(
        {
          message: 'Event creation failed',
          error: e instanceof Error ? e.message : 'Unknown error',
        },
        { status: 400 }
      );
    }

    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { message: 'Image file is required' },
        { status: 400 }
      );
    }

    const tags = JSON.parse(formData.get('tags') as string);
    const agenda = JSON.parse(formData.get('agenda') as string);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { resource_type: 'image', folder: 'DevEvent' },
          (error: unknown, results: unknown) => {
            if (error) return reject(error);

            resolve(results);
          }
        )
        .end(buffer);
    });

    event.image = (uploadResult as { secure_url: string }).secure_url;

    const createdEvent = await Event.create({
      ...event,
      tags: tags,
      agenda: agenda,
    });

    return NextResponse.json(
      { message: 'Event created successfully', event: createdEvent },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        message: 'Event creation failed',
        error: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const events = await Event.find().sort({ createdAt: -1 });
    return NextResponse.json({ events }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        message: 'Event retrieval failed',
        error: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
