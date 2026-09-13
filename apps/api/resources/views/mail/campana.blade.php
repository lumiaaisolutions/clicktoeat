@extends('mail.layout')

@section('title', $local->nombre)
@section('kicker', $local->nombre)

@section('content')
  <div style="font-size:15px;line-height:1.6;color:#374151;">
    {!! nl2br(e($mensaje)) !!}
  </div>
@endsection
